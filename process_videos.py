import yt_dlp
import whisper
import json
import os
import subprocess

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
    # Charlotte Tilbury
    "https://www.youtube.com/shorts/UB-PevK72JE",
    "https://www.youtube.com/shorts/ZvhGxG3Icwo",
    "https://www.youtube.com/shorts/d---xzjHq_Q",
    # Fenty Beauty & Rare Beauty
    "https://www.youtube.com/shorts/CiOoItReFaw",
    "https://www.youtube.com/shorts/HcTqbnFjbHM",
    "https://www.youtube.com/shorts/Krxl71e2-eM"
]
OUTPUT_FILE = "transcript_data.json"
FRAMES_DIR = "frames"

# Ensure frames directory exists
os.makedirs(FRAMES_DIR, exist_ok=True)

print("Loading Whisper model...")
model = whisper.load_model("base")

results = []

for url in YOUTUBE_URLS:
    print(f"\nProcessing: {url}")
    
    # Download MP4 Video (Video + Audio)
    ydl_opts = {
        'format': 'best[ext=mp4]',
        'outtmpl': 'temp_video.%(ext)s',
        'quiet': True,
        'ffmpeg_location': './' 
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            video_id = info_dict.get('id')
            uploader = info_dict.get('uploader', 'Unknown Creator')
            
        print(f"Transcribing audio for {video_id}...")
        result = model.transcribe("temp_video.mp4")
        
        video_data = {
            "video_id": video_id,
            "url": url,
            "influencer": uploader,
            "segments": [],
            "frames": []
        }
        
        for segment in result['segments']:
            video_data["segments"].append({
                "start_time_seconds": int(segment['start']),
                "text": segment['text'].strip()
            })
            
        # Extract frames every 3 seconds (fps=1/3)
        print(f"Extracting sparse frames for {video_id}...")
        video_frame_dir = os.path.join(FRAMES_DIR, video_id)
        os.makedirs(video_frame_dir, exist_ok=True)
        
        # Call local ffmpeg.exe directly
        subprocess.run([
            './ffmpeg.exe', '-y', '-i', 'temp_video.mp4', 
            '-vf', 'fps=1/3', f"{video_frame_dir}/frame_%03d.jpg"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Map frames to their exact timestamps
        extracted_images = sorted(os.listdir(video_frame_dir))
        for index, image_name in enumerate(extracted_images):
            timestamp_seconds = index * 3
            video_data["frames"].append({
                "timestamp_seconds": timestamp_seconds,
                "file_path": os.path.join(video_frame_dir, image_name)
            })

        results.append(video_data)
        
        if os.path.exists("temp_video.mp4"):
            os.remove("temp_video.mp4")
            
    except Exception as e:
        print(f"Failed to process {url}: {e}")

with open(OUTPUT_FILE, 'w') as f:
    json.dump(results, f, indent=4)
    
print(f"\nExtraction complete. Data saved to {OUTPUT_FILE}")
