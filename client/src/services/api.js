import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

// ---------------- Tasks ----------------
export const fetchTasks = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/tasks`);
    return res.data;
  } catch (err) {
    console.error('fetchTasks error', err);
    return [];
  }
};

export const fetchTasksByProject = async (ProjectId) => {
  if (!ProjectId) return [];
  try {
    const res = await axios.get(`${API_BASE_URL}/tasks/project/${ProjectId}`);
    return res.data;
  } catch (err) {
    console.error('fetchTasksByProject error', err);
    return [];
  }
};

export const createTask = async ({ ProjectId, Title, Description, Status, AssigneeId, DueDate }) => {
  try {
    const now = new Date().toISOString();
    const payload = {
      ProjectId,
      Title,
      Description: Description ?? '',
      Status: Status ?? 'Open',
      AssigneeId: AssigneeId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      DueDate: DueDate ?? null,
    };
    const res = await axios.post(`${API_BASE_URL}/tasks`, payload);
    return res.data;
  } catch (err) {
    console.error('createTask error', err);
    throw err;
  }
};

export const updateTask = async (Id, payload) => {
  try {
    const res = await axios.put(`${API_BASE_URL}/tasks/${Id}`, payload);
    return res.data;
  } catch (err) {
    console.error('updateTask error', err);
    throw err;
  }
};

export const deleteTask = async (Id) => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/tasks/${Id}`);
    return res.data;
  } catch (err) {
    console.error('deleteTask error', err);
    throw err;
  }
};

export const getAssigneeById = async (Id) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/tasks/${Id}/assignee`);
    return res.data;
  } catch (err) {
    console.error('getAssigneeById error', err);
    return null;
  }
};

// ---------------- Projects ----------------
export const fetchProjects = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/projects`);
    return res.data;
  } catch (err) {
    console.error('fetchProjects error', err);
    return [];
  }
};

export const createProject = async ({ Name, Description }) => {
  try {
    const payload = {
      Name,
      Description: Description ?? '',
    };
    const res = await axios.post(`${API_BASE_URL}/projects`, payload);
    return res.data;
  } catch (err) {
    console.error('createProject error', err);
    throw err;
  }
};

export const updateProject = async (Id, { name, description }) => {
  try {
    const payload = { name, description }; // אותיות קטנות תואמות לשרת
    const res = await axios.put(`${API_BASE_URL}/projects/${Id}`, payload);
    return res.data;
  } catch (err) {
    console.error('updateProject error', err);
    throw err;
  }
};

export const deleteProject = async (Id) => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/projects/${Id}`);
    return res.data;
  } catch (err) {
    console.error('deleteProject error', err);
    throw err;
  }
};

// ---------------- Users ----------------
export const getUsers = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users`);
    return res.data;
  } catch (err) {
    console.error('getUsers error', err);
    return [];
  }
};

export const getUserById = async (Id) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/users/${Id}`);
    return res.data;
  } catch (err) {
    console.error('getUserById error', err);
    return null;
  }
};

export const createUser = async ({ username, email, full_name, role }) => {
  try {
    const payload = {
      Username: username,
      Email: email,
      FullName: full_name,
      Role: role || 'member',
    };
    const res = await axios.post(`${API_BASE_URL}/users`, payload);
    return res.data.user; // מחזיר את המשתמש שנוצר
  } catch (err) {
    console.error('createUser error', err);
    throw err;
  }
};

export const updateUser = async (Id, { username, email, full_name, role }) => {
  try {
    const payload = {
      Username: username,
      Email: email,
      FullName: full_name,
      Role: role,
    };
    const res = await axios.put(`${API_BASE_URL}/users/${Id}`, payload);
    return res.data.user;
  } catch (err) {
    console.error('updateUser error', err);
    throw err;
  }
};

export const deleteUser = async (Id) => {
  try {
    const res = await axios.delete(`${API_BASE_URL}/users/${Id}`);
    return res.data;
  } catch (err) {
    console.error('deleteUser error', err);
    throw err;
  }
};

// ---------------- Comments ----------------
export const fetchComments = async (TaskId) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/tasks/${TaskId}/comments`);
    return res.data;
  } catch (err) {
    console.error('fetchComments error', err);
    return [];
  }
};

export const addComment = async (TaskId, CommentBody) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/tasks/${TaskId}/comments`, { CommentBody });
    return res.data;
  } catch (err) {
    console.error('addComment error', err);
    throw err;
  }
};
