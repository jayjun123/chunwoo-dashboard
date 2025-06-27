import React, { useState, useEffect } from 'react';
import { Todo } from './Todo';
import { todoApi } from '../services/api';
import { Todo as TodoType } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<TodoType[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTodos();
    }
  }, [user]);

  const loadTodos = async () => {
    if (!user) return;
    try {
      const loadedTodos = await todoApi.getTodos(user.uid);
      setTodos(loadedTodos);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTodo.trim()) return;

    try {
      const todo = await todoApi.addTodo({
        text: newTodo,
        completed: false,
        userId: user.uid,
        createdAt: new Date()
      });
      setTodos([...todos, todo]);
      setNewTodo('');
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const handleToggleTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      await todoApi.updateTodo(id, { completed: !todo.completed });
      setTodos(todos.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await todoApi.deleteTodo(id);
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <form onSubmit={handleAddTodo} className="mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="새로운 할 일을 입력하세요"
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          className="w-full mt-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          추가
        </button>
      </form>

      <div className="space-y-2">
        {todos.map(todo => (
          <Todo
            key={todo.id}
            todo={todo}
            onToggle={handleToggleTodo}
            onDelete={handleDeleteTodo}
          />
        ))}
      </div>
    </div>
  );
}; 