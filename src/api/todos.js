import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const getTodos = async ({ filter = 'all', sortBy = 'created' }) => {
  try {
    const response = await axios.get(`${API_URL}/todos`, {
      params: { filter, sortBy }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '할 일 목록을 불러오는데 실패했습니다.');
  }
};

export const createTodo = async (todoData) => {
  try {
    const response = await axios.post(`${API_URL}/todos`, todoData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '할 일 생성에 실패했습니다.');
  }
};

export const updateTodo = async (id, updates) => {
  try {
    const response = await axios.patch(`${API_URL}/todos/${id}`, updates);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || '할 일 수정에 실패했습니다.');
  }
};

export const deleteTodo = async (id) => {
  try {
    await axios.delete(`${API_URL}/todos/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || '할 일 삭제에 실패했습니다.');
  }
};

export const reorderTodos = async (todoIds) => {
  try {
    await axios.post(`${API_URL}/todos/reorder`, { todoIds });
  } catch (error) {
    throw new Error(error.response?.data?.message || '할 일 순서 변경에 실패했습니다.');
  }
}; 