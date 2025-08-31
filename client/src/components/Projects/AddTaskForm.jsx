import React, { useState, useEffect } from 'react';
import { createTask, getUsers } from '../../services/api';
import { toast } from 'react-toastify';

const AddTaskForm = ({ projectId, onTaskAdded }) => {
  const [title,setTitle] = useState('');
  const [description,setDescription] = useState('');
  const [assigneeId,setAssigneeId] = useState('');
  const [users,setUsers] = useState([]);
  const [loadingUsers,setLoadingUsers] = useState(true);
  const [saving,setSaving] = useState(false);

  useEffect(()=>{
    const loadUsers = async()=>{
      try{
        setLoadingUsers(true);
        const data = await getUsers();
        const arr = Array.isArray(data)?data:(data.users??[]);
        setUsers(arr);
        if(arr.length>0 && arr[0].Id) setAssigneeId(arr[0].Id);
      } catch(err){
        console.error('Failed to load users',err);
        toast.error('Failed to load users');
      } finally{ setLoadingUsers(false); }
    };
    loadUsers();
  },[]);

  const submitTask = async(e)=>{
    e.preventDefault();
    if(!title.trim()||!assigneeId||!projectId){ toast.warning('Title, assignee and project required'); return; }

    setSaving(true);
    try{
      await createTask({ ProjectId: projectId, AssigneeId: assigneeId, Title: title, Description:description||'', Status:'Open' });
      setTitle(''); setDescription(''); setAssigneeId(users.length>0?users[0].Id:'');
      onTaskAdded && onTaskAdded();
      toast.success('Task created');
    } catch(err){
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create task');
    } finally{ setSaving(false); }
  };

  return (
    <form onSubmit={submitTask} style={{ display:'grid', gap:8, marginBottom:16 }}>
      <input placeholder="Task Title" value={title} onChange={e=>setTitle(e.target.value)} required />
      <input placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
      {loadingUsers ? <div>Loading users…</div> : (
        <select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)} required>
          {users.map(u=>u.Id?<option key={u.Id} value={u.Id}>{u.Username}</option>:null)}
        </select>
      )}
      <button type="submit" disabled={saving}>{saving?'Saving…':'Add Task'}</button>
    </form>
  );
};

export default AddTaskForm;
