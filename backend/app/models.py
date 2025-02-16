from sqlalchemy import Column, Integer, String, Float, Date, Time, ForeignKey, TIMESTAMP, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String(255), nullable=False, unique=True)
    hours_per_day = Column(Float, nullable=False)
    deadline = Column(Date, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    schedules = relationship("Schedule", back_populates="task", cascade="all, delete-orphan")
    

    __table_args__ = (
        CheckConstraint('hours_per_day > 0 AND hours_per_day <= 24', name='check_valid_hours'),
        Index('idx_task_deadline', deadline),
        Index('idx_task_name', task_name),
    )

class TimeSlot(Base):
    __tablename__ = "time_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        CheckConstraint('end_time > start_time', name='check_valid_time_range'),
        CheckConstraint(
            "day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')",
            name='check_valid_day'
        ),
        Index('idx_timeslot_day', day_of_week),
        Index('idx_timeslot_times', start_time, end_time),
    )

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    day = Column(String(20), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    task = relationship("Task", back_populates="schedules")

    __table_args__ = (
        CheckConstraint('end_time > start_time', name='check_valid_schedule_time'),
        CheckConstraint(
            "day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')",
            name='check_valid_schedule_day'
        ),
        Index('idx_schedule_day', day),
        Index('idx_schedule_task', task_id),
        Index('idx_schedule_times', start_time, end_time),
    )