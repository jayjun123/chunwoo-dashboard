import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.appspot.com",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const addTodo = async (todo) => {
  try {
    const docRef = await addDoc(collection(db, "todos"), todo);
    return { id: docRef.id, ...todo };
  } catch (error) {
    console.error("Error adding todo:", error);
    throw error;
  }
};

export const getTodos = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "todos"));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting todos:", error);
    throw error;
  }
};

export const deleteTodo = async (id) => {
  try {
    await deleteDoc(doc(db, "todos", id));
    return id;
  } catch (error) {
    console.error("Error deleting todo:", error);
    throw error;
  }
};

export const updateTodo = async (id, updates) => {
  try {
    const todoRef = doc(db, "todos", id);
    await updateDoc(todoRef, updates);
    return { id, ...updates };
  } catch (error) {
    console.error("Error updating todo:", error);
    throw error;
  }
}; 