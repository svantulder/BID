import json
import os
import time
import subprocess
import traceback
from dotenv import load_dotenv
load_dotenv(override=True)

import yt_dlp
import whisper
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional



# ==========================================
# 1. DATA TARGETS & DIRECTORIES
# ==========================================
STATE_FILE = "data/processing_state.json"
OUTPUT_FILE = "data/extracted_entities.json"
FRAMES_DIR = "frames"
TEMP_VIDEO = "temp_video.mp4"

os.makedirs("data", exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

# ==========================================
# 2. MULTI-AXIS DETAILED SCHEMAS
# ==========================================
class AttributeScore(BaseModel):
    attribute: Literal["Application_Ease", "Color_Accuracy", "Longevity", "Texture", "Value", "Packaging"] = Field(description="The specific product attribute being judged.")
    sentiment_score: int = Field(description="Score from -10 (terrible) to +10 (perfect). 0 is neutral.")
    context_quote: str = Field(description="Exact quote justifying the score.")

class CompetitorMention(BaseModel):
    competitor_brand: str
    competitor_product: str
    comparison_nature: Literal["inferior", "superior", "similar"] = Field(description="How the primary product compares TO this competitor.")

class CreatorDemographics(BaseModel):
    estimated_age_bracket: Literal["Gen Z (Under 27)", "Millennial (28-43)", "Gen X (44-59)", "Boomer (60+)", "Unknown"] = Field(description="Visual estimation of creator age.")
    skin_tone_fitzpatrick: Literal["Type I-II (Fair/Light)", "Type III-IV (Medium/Olive)", "Type V-VI (Brown/Dark)", "Unknown"] = Field(description="Estimation of skin tone. Default to Unknown if heavily filtered or unseen.")
    skin_type_indication: Literal["Oily/Acne-Prone", "Dry", "Combination", "Mature", "Unknown"] = Field(description="Any spoken or highly visible indications of skin type.")

CANONICAL_BRANDS = {
    "loreal": "L'Oréal",
    "l'oreal": "L'Oréal",
    "l'oréal": "L'Oréal",
    "l'oreal paris": "L'Oréal",
    "l'oréal paris": "L'Oréal",
    "maybelline": "Maybelline",
    "maybelline new york": "Maybelline",
    "elf": "e.l.f. Cosmetics",
    "e.l.f.": "e.l.f. Cosmetics",
    "elfcosmetics": "e.l.f. Cosmetics",
    "charlotte tilbury": "Charlotte Tilbury",
    "fenty": "Fenty Beauty",
    "fenty beauty": "Fenty Beauty",
    "rare beauty": "Rare Beauty",
    "la prairie": "La Prairie",
    "kylie": "Kylie Cosmetics",
    "kylie cosmetics": "Kylie Cosmetics",
    "rem beauty": "r.e.m. beauty",
    "r.e.m. beauty": "r.e.m. beauty"
}

class Entity(BaseModel):
    brand_name: str = Field(description="The brand being discussed.")
    product_name: str = Field(description="The specific product name.")
    product_category: str = Field(description="High-level category (e.g., Makeup, Skincare, Haircare).")
    sub_category: str = Field(description="Specific sub-category (e.g., Tubing Mascara, Liquid Blush, Setting Spray).")
    
    # New Payload: Ingredients & Demographics
    active_ingredients: List[str] = Field(default_factory=list, description="Specific chemical compounds or active ingredients explicitly mentioned (e.g., Niacinamide, Squalane).")
    creator_demographics: CreatorDemographics = Field(description="Estimated physical attributes of the person reviewing the product.")
    
    overall_sentiment: Literal["positive", "negative", "neutral", "mixed"] = Field(description="Overall sentiment summary.")
    primary_claim: str = Field(description="A tight, 5-to-10-word summary of the main finding.")
    anchor_quote: str = Field(description="The exact quote from the transcript proving the sentiment.")
    
    attributes: List[AttributeScore] = Field(description="Granular multi-axis scoring of individual traits.")
    direct_comparisons: List[CompetitorMention] = Field(default_factory=list, description="Explicit comparisons made by the creator.")
    
    mentioned_in_audio: bool = Field(description="True if explicitly spoken about in the transcript.")
    mentioned_in_caption: bool = Field(description="True if written in the title or description.")
    shown_visually: bool = Field(description="True if physically visible in the provided images.")
    
    spoken_timestamp_seconds: Optional[int] = Field(description="Closest audio timestamp, or null if not spoken.")
    visual_timestamp_seconds: Optional[int] = Field(description="Closest visual timestamp, or null if not shown.")
    confidence_score: int = Field(description="A score from 1-100 indicating classification confidence.")

    @field_validator('brand_name', mode='before')
    @classmethod
    def normalize_brand_name(cls, v: str) -> str:
        if not v:
            return "Unknown"
        # Standardize formatting to catch raw text variations
        lookup = v.strip().lower()
        if lookup in CANONICAL_BRANDS:
            return CANONICAL_BRANDS[lookup]
        
        # Partial matching fallback (e.g., catching "Maybelline NY")
        for key, canonical in CANONICAL_BRANDS.items():
            if key in lookup or lookup in key:
                return canonical
                
        return v.title() # Default fallback format if brand is entirely new

class ExtractionResult(BaseModel):
    entities: List[Entity]

# ==========================================
# 3. STATE LEDGER UTILITIES
# ==========================================
def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}

def save_state(state):
    temp_file = STATE_FILE + ".tmp"
    with open(temp_file, 'w') as f:
        json.dump(state, f, indent=2)
    os.replace(temp_file, STATE_FILE)

def append_extracted_entities(entities: List[dict]):
    existing_data = []
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r') as f:
                existing_data = json.load(f)
        except json.JSONDecodeError:
            print("Warning: Output file corrupted. Overwriting fresh.")
            
    existing_data.extend(entities)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(existing_data, f, indent=4)

# ==========================================
# 4. DATA PIPELINE DATASETS
# ==========================================
YOUTUBE_URLS = [
    # L'Oréal & Maybelline
    "https://www.youtube.com/shorts/AvveXaQ_Ri0",
    "https://www.youtube.com/shorts/536tG6WuqLk",
    "https://www.youtube.com/shorts/CxtcIPXL410",
    "https://www.youtube.com/shorts/7COizuwizFQ",
    "https://www.youtube.com/shorts/eLimlex3Azg",
    # e.l.f. Cosmetics
    "https://www.youtube.com/shorts/UZqxW94AXdM",
    "https://www.youtube.com/shorts/DKmY_7_fdE8",
    "https://www.youtube.com/shorts/zitnZ0MGTzs",
    "https://www.youtube.com/shorts/ET35UahoL34",
    "https://www.youtube.com/shorts/A-7BYaNzbLQ",
    "https://www.youtube.com/shorts/AkOvcxFLJ7o",
    "https://www.youtube.com/shorts/7d1BR3hAIlI",
    # Charlotte Tilbury
    "https://www.youtube.com/shorts/UB-PevK72JE",
    "https://www.youtube.com/shorts/ZvhGxG3Icwo",
    "https://www.youtube.com/shorts/d---xzjHq_Q",
    # Fenty Beauty & Rare Beauty
    "https://www.youtube.com/shorts/CiOoItReFaw",
    "https://www.youtube.com/shorts/HcTqbnFjbHM",
    "https://www.youtube.com/shorts/Krxl71e2-eM",
    # New Competitor Deep-Dives
    "https://www.youtube.com/shorts/utFMQDUG9l4",
    "https://www.youtube.com/shorts/9yM1PGNmkiQ",
    "https://www.youtube.com/shorts/Ac5WHD-4UsE",
    "https://www.youtube.com/shorts/rcugZl3ZLRw",
    "https://www.youtube.com/shorts/M0tORYHl1XE",
    "https://www.youtube.com/shorts/xVP4VBIFTF8",
    "https://www.youtube.com/shorts/MI8lXtVoluU",
    "https://www.youtube.com/shorts/1b4KlmpswAY",
    "https://www.youtube.com/shorts/IT2FXsE1FwI",
    "https://www.youtube.com/shorts/mpb6Jz8vNXM",
    "https://www.youtube.com/shorts/MPSCS9CAXoo",
    "https://www.youtube.com/shorts/kuxEihXeoXE",
    "https://www.youtube.com/shorts/63U98J17xRU",
    "https://www.youtube.com/shorts/baednhcKKyM",
    "https://www.youtube.com/shorts/mpb6Jz8vNXM",
    "https://www.youtube.com/shorts/M0tORYHl1XE",
    "https://www.youtube.com/shorts/CnE7_1aZn1U",
    "https://www.youtube.com/shorts/JFh3krwqjHk",
    "https://www.youtube.com/shorts/b8AtbctLoa4",
    "https://www.youtube.com/shorts/Z8VdY9iFsUE",
    "https://www.youtube.com/shorts/dMupRQstClg",
    "https://www.youtube.com/shorts/ObKz1PMr1mY",
    "https://www.youtube.com/shorts/YDLHarFh4kk",
    "https://www.youtube.com/shorts/niWbC4SyV0k",
    "https://www.youtube.com/shorts/HnR3CPl1kBk",
    "https://www.youtube.com/shorts/0emrrlxx1fY",
    "https://www.youtube.com/shorts/A2zR6p1EyLo",
    "https://www.youtube.com/shorts/wiuhgQrsLn8",
    "https://www.youtube.com/shorts/ZnbcXrJ9toA",
    "https://www.youtube.com/shorts/Ycra1ir-Tck",
    "https://www.youtube.com/shorts/02mnEbsFdQE",
    "https://www.youtube.com/shorts/vFqcljQbNIM",
    "https://www.youtube.com/shorts/uA8ocMRwKK4",
    "https://www.youtube.com/shorts/9TnFecDMOhc",
    "https://www.youtube.com/shorts/xVP4VBIFTF8",
    "https://www.youtube.com/shorts/OzvH57IsIqo",
    "https://www.youtube.com/shorts/liLFDta31v4",
    "https://www.youtube.com/shorts/Vn2W3I7J4KQ",
    "https://www.youtube.com/shorts/GbhFTW5UZe0"
]

# ==========================================
# 5. CORE EXECUTION ENGINE
# ==========================================
def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is missing.")

    client = genai.Client(api_key=api_key)
    
    print("Loading local Whisper model...")
    whisper_model = whisper.load_model("base")
    
    processing_state = load_state()

    for url in YOUTUBE_URLS:
        # Pre-flight extraction to resolve URL to an ID
        try:
            with yt_dlp.YoutubeDL({'quiet': True, 'cookiefile': 'cookies.txt'}) as ydl:
                info = ydl.extract_info(url, download=False)
                video_id = info.get('id')
        except Exception as e:
            print(f"Metadata retrieval error for {url}: {e}")
            continue

        if processing_state.get(video_id, {}).get("status") == "success":
            print(f"Skipping completed video sequence: {video_id}")
            continue

        print(f"\n==========================================")
        print(f"STARTING PIPELINE: {video_id}")
        print(f"==========================================")

        try:
            # Step 1: Media Ingestion
            ydl_opts = {
                'format': 'best', 
                'outtmpl': TEMP_VIDEO,
                'cookiefile': 'cookies.txt',
                'quiet': True,
                'no_warnings': True
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info_dict = ydl.extract_info(url, download=True)
                uploader = info_dict.get('uploader', 'Unknown Creator')
                upload_date = info_dict.get('upload_date', 'Unknown')
                description = info_dict.get('description', '')
                title = info_dict.get('title', '')

            # Step 2: Audio Transcription
            print(f"Transcribing audio track via Whisper...")
            whisper_result = whisper_model.transcribe(TEMP_VIDEO)
            segments = []
            for segment in whisper_result['segments']:
                segments.append({
                    "start_time_seconds": int(segment['start']),
                    "text": segment['text'].strip()
                })

            # Step 3: Sparse Frame Processing
            print(f"Extracting video frames via FFmpeg...")
            video_frame_dir = os.path.join(FRAMES_DIR, video_id)
            os.makedirs(video_frame_dir, exist_ok=True)
            
            subprocess.run([
                'ffmpeg', '-y', '-i', TEMP_VIDEO, 
                '-vf', 'fps=1/3', f"{video_frame_dir}/frame_%03d.jpg"
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            frames = []
            extracted_images = sorted(os.listdir(video_frame_dir))
            for index, image_name in enumerate(extracted_images):
                frames.append({
                    "timestamp_seconds": index * 3,
                    "file_path": os.path.join(video_frame_dir, image_name)
                })

            # Step 4: Structured LLM Analysis
            print(f"Analyzing multimodal vectors via Gemini...")
            transcript_text = "\n".join([f"[{s['start_time_seconds']}s] {s['text']}" for s in segments])
            
            prompt_contents = [
                "You are an expert beauty industry data analyst and cosmetic chemist. Analyze this video's text, transcript, and visual frames.",
                "1. Identify every beauty product present.",
                "2. Extract any specific chemical formulations or active ingredients mentioned for that product (e.g., Peptides, Hyaluronic Acid). Do not guess ingredients if they are not explicitly stated.",
                "3. Analyze the creator's physical demographics. Deduce their Fitzpatrick skin tone and age bracket based on the visual frames. Identify their skin type based on transcript context or visual cues. If lighting/filters make this impossible, or the creator's face is not shown, you MUST output 'Unknown'.",
                "4. Rate individual product attributes and log competitor benchmarks exactly matching the database schema properties.",
                f"Video Title: {title}\n",
                f"Video Description/Caption: {description}\n",
                f"Audio Transcript:\n{transcript_text}\n"
            ]

            for frame in frames:
                try:
                    with open(frame['file_path'], "rb") as img_file:
                        prompt_contents.append(f"Image at {frame['timestamp_seconds']} seconds:")
                        prompt_contents.append(
                            types.Part.from_bytes(data=img_file.read(), mime_type='image/jpeg')
                        )
                except Exception:
                    pass

            # Generative execution
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResult,
                    temperature=0.1,
                ),
            )
            
            result_dict = json.loads(response.text)
            processed_entities = []
            
            for item in result_dict.get('entities', []):
                item['video_id'] = video_id
                item['influencer'] = uploader
                item['upload_date'] = upload_date
                item['creator_location'] = 'Unknown'
                processed_entities.append(item)

            # Step 5: Save State & Flush Output
            if processed_entities:
                append_extracted_entities(processed_entities)

            processing_state[video_id] = {
                "status": "success",
                "timestamp": time.time(),
                "error": None
            }
            print(f"SUCCESS: Pipeline completed for {video_id}")

        except Exception as e:
            print(f"FAILURE: Execution halted on video {video_id}. Error: {e}")
            processing_state[video_id] = {
                "status": "failed",
                "timestamp": time.time(),
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        
        finally:
            save_state(processing_state)
            if os.path.exists(TEMP_VIDEO):
                try:
                    os.remove(TEMP_VIDEO)
                except Exception:
                    pass

    print("\nPipeline run complete. All records synchronized.")

if __name__ == "__main__":
    main()
