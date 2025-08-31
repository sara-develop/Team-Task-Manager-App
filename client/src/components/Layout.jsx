// src/components/Layout.jsx
import React, { useRef } from 'react';
import { TabMenu } from 'primereact/tabmenu';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'primereact/menu';
import './layout.css';

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef(null);

    const purple = "#542468";
    const gray = "#58585a";

    const items = [
        { label: 'Home', icon: 'pi pi-home', path: '/' },
        { label: 'Kanban', icon: 'pi pi-list', path: '/kanban' },
        { label: 'Projects', icon: 'pi pi-folder', path: '/projects' },
        { label: 'Users', icon: 'pi pi-users', path: '/users' },
        { label: 'Create Project', icon: 'pi pi-plus', path: '/create-project' },
        { label: 'Users Management', icon: 'pi pi-users', path: '/users-management' }
    ];

    const activeIndex = items.findIndex(item => item.path === location.pathname);

    const tabMenuStyles = {
        '--tabmenu-active-color': purple,
        '--tabmenu-color': gray
    };

    return (
        <div className="flex flex-column min-h-screen">
            <div className="surface-100 px-3 py-2 flex justify-between align-items-center shadow-1">
                <TabMenu
                    model={items}
                    activeIndex={activeIndex >= 0 ? activeIndex : 0}
                    onTabChange={(e) => navigate(items[e.index].path)}
                    className="border-none"
                    style={tabMenuStyles}
                />
                <div className="relative ml-auto"
                    onMouseEnter={e => menuRef.current?.show(e)}
                    onMouseLeave={e => menuRef.current?.hide(e)}>
                    <Menu />
                </div>
            </div>

            <div className="flex-grow p-4" style={{ backgroundColor: 'transparent', border: 'none' }}>
                {children}
            </div>
        </div>
    );
};

export default Layout;
