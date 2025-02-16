import React, { useState } from 'react';
import './TaskScheduler.css';

const TaskScheduler = () => {
  const [tasks, setTasks] = useState([]);
  const [timeSlots, setTimeSlots] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddTask = (task) => {
    setTasks(prev => [...prev, task]);
  };

  const handleAddTimeSlot = (day, slot) => {
    setTimeSlots(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), slot]
    }));
  };

  const handleCreateSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:8000/api/v1/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: tasks,
          available_time: timeSlots
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create schedule');
      }

      setSchedule(data.schedule);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-scheduler">
      <div className="container">
        {/* Tasks Section */}
        <div className="section tasks-section">
          <div className="section-content">
            <h2 className="section-title">Tasks</h2>
            <form className="add-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddTask({
                task_name: formData.get('task_name'),
                hours_per_day: Number(formData.get('hours_per_day')),
                deadline: formData.get('deadline') || undefined
              });
              e.currentTarget.reset();
            }}>
              <input
                className="form-input"
                name="task_name"
                type="text"
                placeholder="Task Name"
                required
              />
              <input
                className="form-input"
                name="hours_per_day"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="Hours per day"
                required
              />
              <input
                className="form-input"
                name="deadline"
                type="date"
              />
              <button className="submit-btn" type="submit">
                Add Task
              </button>
            </form>

            <div className="list-container">
              <h3 className="list-title">Current Tasks:</h3>
              <ul className="task-list">
                {tasks.map((task, index) => (
                  <li key={index} className="task-item">
                    <div className="task-name">{task.task_name}</div>
                    <div className="task-details">
                      {task.hours_per_day} hours/day
                      {task.deadline && ` (Due: ${task.deadline})`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Time Slots Section */}
          <div className="section time-slots-section">
            <h2 className="section-title">Available Time Slots</h2>
            <form className="add-form" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddTimeSlot(
                formData.get('day'),
                {
                  start: formData.get('start_time'),
                  end: formData.get('end_time')
                }
              );
              e.currentTarget.reset();
            }}>
              <select className="form-select" name="day" required>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <input
                className="form-input"
                name="start_time"
                type="time"
                required
              />
              <input
                className="form-input"
                name="end_time"
                type="time"
                required
              />
              <button className="submit-btn" type="submit">
                Add Time Slot
              </button>
            </form>

            <div className="list-container">
              <h3 className="list-title">Current Time Slots:</h3>
              {Object.entries(timeSlots).map(([day, slots]) => (
                <div key={day} className="time-slot-day">
                  <div className="day-title">{day}</div>
                  <ul className="time-slot-list">
                    {slots.map((slot, index) => (
                      <li key={index} className="time-slot-item">
                        {slot.start} - {slot.end}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="section schedule-section">
          <h2 className="section-title">Schedule</h2>
          
          <button
            className={`generate-btn ${loading ? 'loading' : ''}`}
            onClick={handleCreateSchedule}
            disabled={loading || tasks.length === 0 || Object.keys(timeSlots).length === 0}
          >
            {loading ? 'Generating Schedule...' : 'Generate Schedule'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {schedule.length > 0 && (
            <div className="schedule-container">
              {schedule.map((daySchedule, index) => (
                <div key={index} className="schedule-day">
                  <h3 className="day-title">{daySchedule.day}</h3>
                  <ul className="schedule-list">
                    {daySchedule.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="schedule-item">
                        <span className="task-name">{task.task_name}</span>
                        <span className="task-time">
                          {task.start_time} - {task.end_time}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskScheduler;