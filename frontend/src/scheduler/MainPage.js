// src/scheduler/MainPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Task Management System</h1>
      
      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/scheduler')}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Schedule Generator
        </button>

        <button 
          onClick={() => navigate('/todo')}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Todo List
        </button>
      </div>
    </div>
  );
};

export default MainPage;