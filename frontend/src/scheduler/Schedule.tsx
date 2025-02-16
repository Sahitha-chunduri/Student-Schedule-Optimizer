import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api/v1/schedule/";

// Define types for better type safety
interface TimeSlot {
  start: string;
  end: string;
}

interface Task {
  task_name: string;
  hours_per_day: number;
  deadline?: string;
}

interface SchedulerInput {
  tasks: Task[];
  available_time: Record<string, TimeSlot[]>;
}

interface ScheduledTask {
  task_name: string;
  start_time: string;
  end_time: string;
  duration: number;
}

interface DailySchedule {
  day: string;
  tasks: ScheduledTask[];
}

interface SchedulerOutput {
  schedule: DailySchedule[];
  status: string;
  message: string;
}

// Function to call the schedule creation API
export const createSchedule = async (data: SchedulerInput): Promise<SchedulerOutput | null> => {
  try {
    const response = await axios.post<SchedulerOutput>(API_BASE_URL, data);
    return response.data;
  } catch (error: any) {
    console.error("Error creating schedule:", error?.response?.data || error.message);
    return null;
  }
};
