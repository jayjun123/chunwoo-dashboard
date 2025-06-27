import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { Todo } from '../types';

export const todoApi = {
  async addTodo(todo: Omit<Todo, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, 'todos'), todo);
      return { id: docRef.id, ...todo };
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  },

  async updateTodo(id: string, updates: Partial<Todo>) {
    try {
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  },

  async deleteTodo(id: string) {
    try {
      const todoRef = doc(db, 'todos', id);
      await deleteDoc(todoRef);
      return id;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  },

  async getTodos(userId: string) {
    try {
      const q = query(collection(db, 'todos'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];
    } catch (error) {
      console.error('Error getting todos:', error);
      throw error;
    }
  }
}; 