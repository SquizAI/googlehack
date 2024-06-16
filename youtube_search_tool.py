# youtube_search_tool.py
from langchain.tools.base import BaseTool
from googleapiclient.discovery import build
from youtube_transcript_api import YouTubeTranscriptApi
import json
from pydantic import Field

class YoutubeSearchTool(BaseTool):
    name: str = "YoutubeSearchTool"
    youtube_api_key: str = Field(..., description="API key for accessing YouTube data.")
    description: str = (
        "A tool that fetches search results from YouTube based on a query.\n"
        "Arguments:\n"
        "- query: The search term to look for on YouTube.\n"
        "- youtube_api_key: The API key to access YouTube data.\n\n"
        "Output Format:\n"
        "- Title\n"
        "- Description\n"
        "- URL\n"
    )

    def __init__(self, youtube_api_key: str, *args, **kwargs):
        if not youtube_api_key:
            raise ValueError("A valid YouTube developer key must be provided.")
        kwargs["youtube_api_key"] = youtube_api_key
        super().__init__(*args, **kwargs)

    def _run(self, query: str, max_results: int = 5) -> str:
        YOUTUBE_API_SERVICE_NAME = "youtube"
        YOUTUBE_API_VERSION = "v3"
        youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, developerKey=self.youtube_api_key)

        search_response = youtube.search().list(
            q=query,
            part="id,snippet",
            maxResults=max_results
        ).execute()

        videos = search_response.get("items", [])
        results = []

        for video in videos:
            video_id = video["id"]["videoId"]
            title = video["snippet"]["title"]
            description = video["snippet"]["description"]
            url = f"https://www.youtube.com/watch?v={video_id}"
            results.append({"title": title, "description": description, "url": url})

        return json.dumps(results)

    async def _arun(self, query: str, max_results: int = 5) -> str:
        return self._run(query, max_results)

