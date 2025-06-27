import { createStore } from 'redux';

const initialState = {
  calendarEvents: {}
};

function rootReducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_CALENDAR_EVENTS':
      return {
        ...state,
        calendarEvents: action.payload
      };
    default:
      return state;
  }
}

const store = createStore(rootReducer);

export default store; 