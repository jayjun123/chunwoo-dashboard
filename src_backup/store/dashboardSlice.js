import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  todayCount: 0,
  todayItems: []
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setTodayCount: (state, action) => {
      state.todayCount = action.payload;
    },
    setTodayItems: (state, action) => {
      state.todayItems = action.payload;
    }
  }
});

export const { setTodayCount, setTodayItems } = dashboardSlice.actions;
export default dashboardSlice.reducer; 