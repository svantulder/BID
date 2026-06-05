import json
import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Literal

# 1. Updated Database Schema for Higher Signal
class Entity(BaseModel):
    brand_name: str = Field(description="The brand being discussed (e.g., L'Oréal, e.l.f., Rare Beauty).")
    product_name: str = Field(description="The specific product name.")
    sentiment: Literal["positive", "negative", "neutral", "comparison"] = Field(
        description="The sentiment of the mention. Must be exactly one of: 'positive', 'negative', 'neutral', or 'comparison'."
    )
    trigger_category: Literal["Texture", "Pricing", "Shade Range", "Longevity", "Oxidation", "Application"] = Field(
        description="The primary technical reason behind the sentiment. Must be exactly one of the provided options."
    )
    primary_claim: str = Field(description="A tight, 5-to-10-word summary of the main finding or core claim.")
    anchor_quote: str = Field(description="The exact quote from the transcript under 80 characters that proves this sentiment.")
    spoken_timestamp_seconds: int = Field(description="The closest timestamp in seconds where this product was spoken about.")
    visual_timestamp_seconds: int | None = Field(
        description="The timestamp in seconds where the product is physically visible in the provided images, or null if not visible."
    )

class ExtractionResult(BaseModel):
    entities: List[Entity]

# Initialize Gemini Client
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable is missing.")

client = genai.Client(api_key=api_key)

def extract_multimodal_insights():
    try:
        with open("transcript_data.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: transcript_data.json not found. Run process_videos.py first.")
        return

    extracted_results = []
    model_id = 'gemini-2.5-flash'

    for video in data:
        print(f"Analyzing video: {video['video_id']}")
        
        # Structure the transcript with timestamps for the LLM
        transcript_text = "\n".join([f"[{seg['start_time_seconds']}s] {seg['text']}" for seg in video['segments']])
        
        # Prepare the payload with precise instructions, text, and images
        prompt_contents = [
            "You are an expert beauty industry data analyst. Analyze this video transcript and the provided frames.",
            "Extract every beauty product mentioned in the speech.",
            "For each product, evaluate the specific trigger_category, primary_claim, and pull a short anchor_quote.",
            "Then, review the provided images. If the product is physically visible in any of the images, set visual_timestamp_seconds to the timestamp of that specific image. If it is not visible, set it to null.",
            f"Transcript:\n{transcript_text}\n"
        ]
        
        # Load the images as raw bytes to pass to the model
        for frame in video.get('frames', []):
            try:
                with open(frame['file_path'], "rb") as img_file:
                    image_bytes = img_file.read()
                    prompt_contents.append(f"Image at {frame['timestamp_seconds']} seconds:")
                    prompt_contents.append(
                        types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
                    )
            except Exception as e:
                print(f"Skipping frame {frame['file_path']}: {e}")
        
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=prompt_contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResult,
                    temperature=0.1,
                ),
            )
            
            result_dict = json.loads(response.text)
            
            # Map video metadata back to the entities
            for item in result_dict.get('entities', []):
                item['video_id'] = video['video_id']
                item['influencer'] = video.get('influencer', 'Unknown Creator')
                extracted_results.append(item)
                
        except Exception as e:
            print(f"Failed to parse insights for {video['video_id']}: {e}")

    # Save to the root destination
    with open("extracted_entities.json", "w") as f:
        json.dump(extracted_results, f, indent=4)
        
    print("Multimodal extraction complete. Output saved to extracted_entities.json")

if __name__ == "__main__":
    extract_multimodal_insights()
