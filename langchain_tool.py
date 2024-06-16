# langchain_tool.py
from langchain.chains import LLMChain
from langchain.agents import create_openai_functions_agent
from langchain_openai.chat_models import ChatOpenAI
from langchain_core.tools.base import Tool
from youtube_search_tool import YoutubeSearchTool
from langchain.prompts import PromptTemplate
import os

class MyLangChain:
    def __init__(self):
        self.tools = {
            'youtube_search': YoutubeSearchTool(name="YoutubeSearch", youtube_api_key=os.getenv('YOUTUBE_API_KEY'))
        }
        self.llm = ChatOpenAI(api_key=os.getenv('OPENAI_API_KEY'), model='gpt-4')

        prompt_template = """
        You are a helpful assistant that can perform various tasks using different tools. 
        Your available tools are: 
        - YoutubeSearch: to search YouTube for videos.
        
        When a user asks you something, determine the appropriate tool to use and provide the necessary information.
        """
        prompt = PromptTemplate(input_variables=["query"], template=prompt_template)

        self.chain = create_openai_functions_agent(llm=self.llm, tools=list(self.tools.values()), prompt=prompt)

    def run(self, query: str):
        return self.chain.run(query)
