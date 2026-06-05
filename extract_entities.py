import json
import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# 1. Updated Database Schema
class Entity(BaseModel):
    brand_name: str = Field(description="e.l.f., Rare Beauty, etc.")
    product_name: str = Field(description="The specific product name")
    sentiment: str = Field(description="positive, negative, neutral, or comparison")
    spoken_timestamp_seconds: int = Field(description="The closest timestamp in seconds where it was spoken")
    visual_timestamp_seconds: int | None = Field(description="The timestamp in seconds where the product is physically visible in the provided images, or null if not visible")

class ExtractionResult(BaseModel):
    entities: list[Entity]

client = genai.Client(api_key="find the key in google ai and paste it")

def extract_multimodal_insights():
    try:
        with open("transcript_data.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: transcript_data.json not found.")
        return

    extracted_results = []
    model_id = 'gemini-2.5-flash'

    for video in data:
        print(f"Analyzing video: {video['video_id']}")
        
        transcript_text = "\n".join([f"[{seg['start_time_seconds']}s] {seg['text']}" for seg in video['segments']])
        
        # Prepare the payload with instructions, text, and images
        prompt_contents = [
            "You are an expert beauty industry data analyst. Analyze this video transcript and the provided frames.",
            "Extract every beauty product mentioned in the speech.",
            "For each product, identify the spoken_timestamp_seconds.",
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
            
            for item in result_dict.get('entities', []):
                item['video_id'] = video['video_id']
                extracted_results.append(item)
                
        except Exception as e:
            print(f"Failed to parse insights for {video['video_id']}: {e}")

    with open("extracted_entities.json", "w") as f:
        json.dump(extracted_results, f, indent=4)
        
    print("Multimodal extraction complete. Output saved to extracted_entities.json")

if __name__ == "__main__":
    extract_multimodal_insights()