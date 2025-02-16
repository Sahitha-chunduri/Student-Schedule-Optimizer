import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1/schedule';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface Task {
  task_name: string;
  hours_per_day: number;
  deadline?: string;
}

export interface SchedulerInput {
  tasks: Task[];
  available_time: {
    [key: string]: TimeSlot[];
  };
}

export interface ScheduledTask {
  task_name: string;
  start_time: string;
  end_time: string;
  duration: number;
}

export interface DailySchedule {
  day: string;
  tasks: ScheduledTask[];
}

export interface SchedulerOutput {
  schedule: DailySchedule[];
  status: string;
  message: string;
}

export const schedulerApi = {
  createSchedule: async (input: SchedulerInput): Promise<SchedulerOutput> => {
    try {
      const response = await axios.post<SchedulerOutput>(API_BASE_URL, input);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create schedule');
    }
  }
};

export default schedulerApi;