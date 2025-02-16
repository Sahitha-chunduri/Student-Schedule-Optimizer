from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from ortools.sat.python import cp_model
from typing import List, Dict, Optional
from app.database import get_db
from app.models import Task as DBTask, TimeSlot as DBTimeSlot, Schedule as DBSchedule
from app.schemas import (
    SchedulerInput, SchedulerOutput, DailySchedule, 
    ScheduledTask, Task, TimeSlot
)

router = APIRouter()

def parse_time(time_str: str) -> int:
    try:
        hours, minutes = map(int, time_str.split(':'))
        return hours * 60 + minutes
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {time_str}. Use HH:MM format.")

def format_time(minutes: int) -> str:
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"

def calculate_priority(deadline: Optional[str], current_date: datetime) -> float:
    if not deadline:
        return 0.0
    try:
        deadline_date = datetime.strptime(deadline, "%Y-%m-%d")
        days_remaining = max(0, (deadline_date - current_date).days)
        return 1 / (days_remaining + 1)
    except ValueError:
        return 0.0

def save_tasks_to_db(db: Session, tasks: List[Task]):
    try:
        # Clear existing tasks
        db.query(DBTask).delete()
        
        # Insert new tasks
        for task in tasks:
            db_task = DBTask(
                task_name=task.task_name,
                hours_per_day=task.hours_per_day,
                deadline=datetime.strptime(task.deadline, "%Y-%m-%d").date() if task.deadline else None
            )
            db.add(db_task)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save tasks: {str(e)}")

def save_time_slots_to_db(db: Session, time_slots: Dict[str, List[TimeSlot]]):
    try:
        # Clear existing time slots
        db.query(DBTimeSlot).delete()
        
        # Insert new time slots
        for day, slots in time_slots.items():
            for slot in slots:
                db_slot = DBTimeSlot(
                    day_of_week=day,
                    start_time=datetime.strptime(slot.start, "%H:%M").time(),
                    end_time=datetime.strptime(slot.end, "%H:%M").time()
                )
                db.add(db_slot)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save time slots: {str(e)}")

def save_schedule_to_db(db: Session, schedule: List[DailySchedule]):
    try:
        db.query(DBSchedule).delete()
        for daily_schedule in schedule:
            for task in daily_schedule.tasks:
                db_task = db.query(DBTask).filter(DBTask.task_name == task.task_name).first()
                if not db_task:
                    continue
                
                new_schedule = DBSchedule(
                    day=daily_schedule.day,
                    task_id=db_task.id,
                    start_time=datetime.strptime(task.start_time, "%H:%M").time(),
                    end_time=datetime.strptime(task.end_time, "%H:%M").time()
                )
                db.add(new_schedule)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save schedule: {str(e)}")

@router.post("/", response_model=SchedulerOutput)
async def create_schedule(input_data: SchedulerInput, db: Session = Depends(get_db)):
    try:
        save_tasks_to_db(db, input_data.tasks)
        save_time_slots_to_db(db, input_data.available_time)
        model = cp_model.CpModel()
        current_date = datetime.now()
        processed_tasks = []
        reduced_hours = {}
        for task in input_data.tasks:
            priority = calculate_priority(task.deadline, current_date)
            original_hours = task.hours_per_day
            reduced_hours[task.task_name] = max(0.5, original_hours * 0.75)
            processed_tasks.append({
                "task_name": task.task_name,
                "hours_per_day": reduced_hours[task.task_name],
                "priority": priority,
                "original_hours": original_hours
            })
        processed_tasks.sort(key=lambda x: x["priority"], reverse=True)
        scheduling_vars = {}
        all_slots = {}
        for day, time_slots in input_data.available_time.items():
            day_slots = []
            for slot in time_slots:
                start = parse_time(slot.start)
                end = parse_time(slot.end)
                day_slots.append((start, end))
            all_slots[day] = day_slots

        for day, slots in all_slots.items():
            for start_time, end_time in slots:
                for task_data in processed_tasks:
                    task_name = task_data["task_name"]
                    for duration in [30, 60]:
                        for start in range(start_time, end_time - duration + 1, 15):
                            var = model.NewBoolVar(f'{task_name}{day}{start}_{duration}')
                            scheduling_vars[(task_name, day, start, duration)] = var

        for day in all_slots:
            for task_data in processed_tasks:
                task_name = task_data["task_name"]
                total_minutes = int(task_data["hours_per_day"] * 60)
                
                task_vars_day = []
                task_durations = []
                
                for (t_name, d, start, duration), var in scheduling_vars.items():
                    if t_name == task_name and d == day:
                        task_vars_day.append(var)
                        task_durations.append(duration)
                
                if task_vars_day:
                    model.Add(sum(var * dur for var, dur in zip(task_vars_day, task_durations)) >= total_minutes)
                    model.Add(sum(task_vars_day) == 1)

        for day in all_slots:
            for (task1, d1, start1, dur1), var1 in scheduling_vars.items():
                if d1 != day:
                    continue
                for (task2, d2, start2, dur2), var2 in scheduling_vars.items():
                    if d2 != day or task1 == task2 or start1 >= start2:
                        continue
                    if start1 + dur1 > start2:
                        model.Add(var1 + var2 <= 1)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 10
        status = solver.Solve(model)

        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            schedule = []
            for day in all_slots:
                daily_tasks = []
                for (task_name, d, start, duration), var in scheduling_vars.items():
                    if d == day and solver.Value(var) == 1:
                        task_data = next(t for t in processed_tasks if t["task_name"] == task_name)
                        daily_tasks.append(ScheduledTask(
                            task_name=task_name,
                            start_time=format_time(start),
                            end_time=format_time(start + duration),
                            duration=duration,
                            priority=task_data["priority"]
                        ))
                
                if daily_tasks:
                    schedule.append(DailySchedule(
                        day=day,
                        tasks=sorted(daily_tasks, key=lambda x: x.start_time)
                    ))

            save_schedule_to_db(db, schedule)

            return SchedulerOutput(
                schedule=schedule,
                status="success",
                message="Schedule created and saved successfully",
                reduced_hours=reduced_hours
            )
        else:
            schedule = []
            for day, slots in all_slots.items():
                daily_tasks = []
                available_start, available_end = slots[0]
                remaining_time = available_end - available_start

                for task_data in processed_tasks:
                    if remaining_time <= 0:
                        break

                    required_minutes = int(task_data["hours_per_day"] * 60)
                    if remaining_time >= required_minutes:
                        daily_tasks.append(ScheduledTask(
                            task_name=task_data["task_name"],
                            start_time=format_time(available_start),
                            end_time=format_time(available_start + required_minutes),
                            duration=required_minutes,
                            priority=task_data["priority"]
                        ))
                        remaining_time -= required_minutes
                        available_start += required_minutes

                if daily_tasks:
                    schedule.append(DailySchedule(day=day, tasks=daily_tasks))
            save_schedule_to_db(db, schedule)

            return SchedulerOutput(
                schedule=schedule,
                status="fallback",
                message="Using fallback manual allocation due to no optimal solution found",
                reduced_hours=reduced_hours
            )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/tasks", response_model=List[Task])
async def get_tasks(db: Session = Depends(get_db)):
    try:
        tasks = db.query(DBTask).all()
        return [Task(
            task_name=task.task_name,
            hours_per_day=task.hours_per_day,
            deadline=task.deadline.strftime("%Y-%m-%d") if task.deadline else None
        ) for task in tasks]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/schedules", response_model=List[dict])
async def get_schedules(db: Session = Depends(get_db)):
    try:
        schedules = db.query(DBSchedule).all()
        return [{
            "task_id": schedule.task_id,
            "day": schedule.day,
            "start_time": schedule.start_time.strftime("%H:%M"),
            "end_time": schedule.end_time.strftime("%H:%M")
        } for schedule in schedules]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    try:
        schedule = db.query(DBSchedule).filter(DBSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        db.delete(schedule)
        db.commit()
        return {"message": "Schedule deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    try:
        db.query(DBSchedule).filter(DBSchedule.task_id == task_id).delete()
        task = db.query(DBTask).filter(DBTask.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        db.delete(task)
        db.commit()
        return {"message": "Task and associated schedules deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))