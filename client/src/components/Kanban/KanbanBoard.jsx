import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { fetchProjects, fetchTasksByProject, updateTask, getUsers } from '../../services/api';
import TaskCard from '../Projects/TaskCard';
import './Kanban.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const COLUMN_ORDER = ['Open', 'In Progress', 'Done'];
const COLUMN_COLORS = { 'Open': '#FFD700', 'In Progress': '#00BFFF', 'Done': '#32CD32' };

const KanbanBoard = () => {
  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const usersList = await getUsers();
        setUsers(usersList);
        const usersMap = Object.fromEntries(usersList.map(u => [u.Id, u]));

        const projs = await fetchProjects();
        setProjects(projs);

        const tasksMap = {};
        for (let proj of projs) {
          const tasks = await fetchTasksByProject(proj.Id);
          const grouped = { 'Open': [], 'In Progress': [], 'Done': [] };
          tasks.forEach(t => {
            t.Assignee = t.AssigneeId ? usersMap[t.AssigneeId] : null;
            grouped[t.Status || 'Open'].push(t);
          });
          tasksMap[proj.Id] = grouped;
        }
        setTasksByProject(tasksMap);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const onDragEnd = async (result, projectId) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceTasks = Array.from(tasksByProject[projectId][source.droppableId]);
    const [moved] = sourceTasks.splice(source.index, 1);
    const destTasks = Array.from(tasksByProject[projectId][destination.droppableId]);
    moved.Status = destination.droppableId;
    destTasks.splice(destination.index, 0, moved);

    const newTasksMap = {
      ...tasksByProject,
      [projectId]: {
        ...tasksByProject[projectId],
        [source.droppableId]: sourceTasks,
        [destination.droppableId]: destTasks
      }
    };
    setTasksByProject(newTasksMap);

    try {
      // בדיקה עם ה־route החדש לפני העדכון
      if (moved.AssigneeId && ['Open', 'In Progress'].includes(moved.Status)) {
        const checkRes = await fetch(
          `http://localhost:3001/tasks/${moved.Id}/check-assignee-limit?newStatus=${encodeURIComponent(moved.Status)}`
        );
        const data = await checkRes.json();

        if (!data.allowed) {
          // אם לא מותר – הסר את האחראי והצג הודעה
          moved.AssigneeId = null;
          moved.Assignee = null;
          toast.warning('האחראי הוסר עקב מגבלת משימות. יש לבחור אחראי חדש למשימה.', {
            position: "top-right",
            autoClose: 5000,
            theme: "colored",
          });
        }
      }

      const res = await updateTask(moved.Id, moved);

      // עדכון המשימה לפי מה שהשרת החזיר
      if (res.task) {
        setTasksByProject(prev => {
          const newTasks = { ...prev };
          for (let col in newTasks[projectId]) {
            newTasks[projectId][col] = newTasks[projectId][col].map(t =>
              t.Id === res.task.Id
                ? { ...res.task, Assignee: res.task.AssigneeId ? users.find(u => u.Id === res.task.AssigneeId) : null }
                : t
            );
          }
          return newTasks;
        });
      }

    } catch (err) {
      console.error('Failed to update task', err);
      toast.error('לא ניתן לשנות את הסטטוס – ייתכן שהאחראי כבר מלא במשימות.');

      // רענון מלא מהשרת כדי להחזיר את המשימות למצב תקין
      const tasks = await fetchTasksByProject(projectId);
      const grouped = { 'Open': [], 'In Progress': [], 'Done': [] };
      const usersMap = Object.fromEntries(users.map(u => [u.Id, u]));
      tasks.forEach(t => {
        t.Assignee = t.AssigneeId ? usersMap[t.AssigneeId] : null;
        grouped[t.Status || 'Open'].push(t);
      });
      setTasksByProject(prev => ({ ...prev, [projectId]: grouped }));
    }
  };


  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="kanban-container">
      {projects.map(project => (
        <div key={project.Id} className="kanban-project-card">
          <h2>{project.Name}</h2>
          <DragDropContext onDragEnd={(result) => onDragEnd(result, project.Id)}>
            <div className="kanban-columns-wrapper">
              {COLUMN_ORDER.map(colKey => (
                <Droppable key={colKey} droppableId={colKey}>
                  {(provided) => (
                    <div
                      className="kanban-column"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ backgroundColor: COLUMN_COLORS[colKey] + '20' }}
                    >
                      <h3 className="kanban-column-title">{colKey}</h3>
                      {tasksByProject[project.Id]?.[colKey]?.map((task, index) => (
                        <Draggable
                          key={`${project.Id}-${colKey}-${task.Id}`}
                          draggableId={`${project.Id}-${colKey}-${task.Id}`}
                          index={index}
                        >
                          {(prov) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}>
                              <TaskCard
                                task={task}
                                users={users}
                                onStatusChange={(updatedTask) => {
                                  setTasksByProject(prev => {
                                    const newTasks = { ...prev };
                                    for (let col in newTasks[project.Id]) {
                                      newTasks[project.Id][col] = newTasks[project.Id][col].map(t =>
                                        t.Id === updatedTask.Id ? updatedTask : t
                                      );
                                    }
                                    return newTasks;
                                  });
                                }}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
