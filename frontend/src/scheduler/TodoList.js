import React, { useState, useEffect } from "react";
import { 
  Plus,
  Clock,
  Calendar,
  ArrowLeft,
  Trash,
  RefreshCcw,
  AlertCircle,
  Loader 
} from "lucide-react";
import './TodoList.css';
const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState("");
  const [day, setDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_BASE_URL = "http://localhost:8000/api/v1/schedule";

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksResponse, schedulesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/tasks`),
        fetch(`${API_BASE_URL}/schedules`),
      ]);

      if (!tasksResponse.ok || !schedulesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const tasksData = await tasksResponse.json();
      const schedulesData = await schedulesResponse.json();

      setTasks(tasksData);

      const taskMap = tasksData.reduce((acc, task, index) => {
        acc[index + 1] = task;
        return acc;
      }, {});

      const schedulesWithTasks = schedulesData.map((schedule) => ({
        ...schedule,
        task_name: taskMap[schedule.task_id]?.task_name || "Unknown Task",
        completed: schedule.status === "completed",
      }));

      setTodos(schedulesWithTasks);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskName || !day || !startTime || !endTime) {
      alert("Please fill in all fields!");
      return;
    }

    try {
      setIsSubmitting(true);

      const taskResponse = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_name: taskName,
        }),
      });

      if (!taskResponse.ok) {
        throw new Error("Failed to create task");
      }

      const taskData = await taskResponse.json();

      const scheduleResponse = await fetch(`${API_BASE_URL}/schedules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskData.id,
          day,
          start_time: startTime,
          end_time: endTime,
          status: "pending"
        }),
      });

      if (!scheduleResponse.ok) {
        throw new Error("Failed to create schedule");
      }

      await fetchData();
      
      setTaskName("");
      setDay("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskCompletion = async (scheduleId, index) => {
    try {
      const updatedTodos = todos.map((todo, i) => {
        if (i === index) {
          return { ...todo, completed: true };
        }
        return todo;
      });
      setTodos(updatedTodos);

      const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed"
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      setTimeout(() => {
        setTodos(updatedTodos.filter(todo => !todo.completed));
      }, 1000);
    } catch (err) {
      console.error("Error completing task:", err);
      alert("Failed to update task status. Please try again.");
      await fetchData();
    }
  };

  const handleDeleteTask = async (scheduleId, taskId, index) => {
    try {
      setTodos(todos.filter((_, i) => i !== index));

      const scheduleResponse = await fetch(`${API_BASE_URL}/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (!scheduleResponse.ok) {
        throw new Error("Failed to delete schedule");
      }

      const taskResponse = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!taskResponse.ok) {
        throw new Error("Failed to delete task");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task. Please try again.");
      await fetchData();
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="todo-container">
      <div className="content-wrapper">
        <button
          onClick={() => window.history.back()}
          className="back-button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="header">
          <div className="header-title">
            <h1>Task Manager</h1>
          </div>
          <button
            onClick={fetchData}
            className="refresh-button"
            title="Refresh data"
            disabled={loading}
          >
            {loading ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              <RefreshCcw size={20} />
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="add-task-section">
          <h2 className="add-task-title">Add New Task</h2>
          <div className="add-task-form">
            <input
              type="text"
              placeholder="Task Name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="form-input"
              disabled={isSubmitting}
            />
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="form-input"
              disabled={isSubmitting}
            >
              <option value="">Select Day</option>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="form-input"
              disabled={isSubmitting}
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="form-input"
              disabled={isSubmitting}
            />
          </div>
          <button 
            onClick={handleAddTask}
            className="add-button"
            disabled={isSubmitting || !taskName || !day || !startTime || !endTime}
          >
            {isSubmitting ? (
              <Loader size={20} className="animate-spin" />
            ) : (
              <Plus size={20} />
            )}
            Add Task
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div>Loading tasks...</div>
          </div>
        ) : todos.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          <div className="todo-list">
            {todos.map((schedule, index) => (
              <div
                key={schedule.id}
                className={`todo-item ${schedule.completed ? 'completed' : ''}`}
              >
                <div className="todo-content">
                  <div className="todo-left">
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={schedule.completed}
                        onChange={() => handleTaskCompletion(schedule.id, index)}
                        id={`task-${schedule.id}`}
                      />
                    </div>
                    <div className="task-details">
                      <h3 className="task-name">{schedule.task_name}</h3>
                      <div className="task-meta">
                        <div className="meta-item">
                          <Calendar size={16} />
                          <span>{schedule.day}</span>
                        </div>
                        <div className="meta-item">
                          <Clock size={16} />
                          <span>{schedule.start_time} - {schedule.end_time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteTask(schedule.id, schedule.task_id, index)}
                    aria-label="Delete task"
                  >
                    <Trash size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;
