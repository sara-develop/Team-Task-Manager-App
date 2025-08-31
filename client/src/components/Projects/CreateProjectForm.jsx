// src/components/CreateProjectForm.jsx
import React, { useState } from 'react';
import { createProject } from '../../services/api';
import './CreateProjectForm.css';

const CreateProjectForm = ({ onCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const project = await createProject({ name, description });
            onCreated && onCreated(project);
            setName('');
            setDescription('');
            alert('Project created successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to create project');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="create-project-wrapper">
            <form className="create-project-form" onSubmit={handleSubmit}>
                <h2>Create Project</h2>
                <input
                    type="text"
                    value={name}
                    placeholder="Project name"
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <textarea
                    value={description}
                    placeholder="Project description (optional)"
                    onChange={(e) => setDescription(e.target.value)}
                />
                <button type="submit" disabled={saving}>
                    {saving ? 'Creating…' : 'Create Project'}
                </button>
            </form>
        </div>
    );
};

export default CreateProjectForm;
