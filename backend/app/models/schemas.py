from pydantic import BaseModel
from typing import List, Optional

class Node(BaseModel):
    id: str
    label: str
    size: Optional[float] = 1.0
    group: Optional[str] = None

class EdgeTask(BaseModel):
    title: str
    details: Optional[str] = None
    snippets: List[str] = []

class Edge(BaseModel):
    source: str
    target: str
    weight: Optional[float] = 1.0
    tasks: List[EdgeTask] = []

class StarConnect(BaseModel):
    nodes: List[Node] = []
    edges: List[Edge] = []
    matrix: List[List[float]] = []

class SummaryBlock(BaseModel):
    bullets: List[str] = []

class TaskItem(BaseModel):
    owner: Optional[str] = None
    description: str
    due: Optional[str] = None
    priority: Optional[str] = None
    source_snippet: Optional[str] = None
    assignees: List[str] = []

class TaskList(BaseModel):
    items: List[TaskItem] = []

class ProcessResponse(BaseModel):
    date_dir: str
    star_connect: StarConnect
    summary: SummaryBlock
    tasks: TaskList
