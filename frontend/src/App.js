import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TaskScheduler from './scheduler/TaskScheduler';
import TodoList from './scheduler/TodoList';
import MainPage from './scheduler/MainPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/scheduler" element={<TaskScheduler />} />
      <Route path="/todo" element={<TodoList />} />
    </Routes>
  );
};

export default App;