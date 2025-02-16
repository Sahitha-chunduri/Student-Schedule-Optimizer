from pydantic import BaseModel, constr
from typing import List, Dict, Optional
from datetime import date, time

class Task(BaseModel):
    task_name: str
    hours_per_day: float
    deadline: Optional[str] = None

class TimeSlot(BaseModel):
    start: str  # Format: "HH:MM"
    end: str    # Format: "HH:MM"

class ScheduledTask(BaseModel):
    task_name: str
    start_time: str
    end_time: str
    duration: int
    priority: float

class DailySchedule(BaseModel):
    day: str
    tasks: List[ScheduledTask]

class SchedulerInput(BaseModel):
    tasks: List[Task]
    available_time: Dict[str, List[TimeSlot]]

class SchedulerOutput(BaseModel):
    schedule: List[DailySchedule]
    status: str
    message: str
    reduced_hours: Dict[str, float]