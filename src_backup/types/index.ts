export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
} 