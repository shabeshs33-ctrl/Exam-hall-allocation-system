import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, Users, FileText, Building, ListOrdered, LogOut } from "lucide-react";

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/students", label: "Students", icon: <Users size={20} /> },
    { path: "/exams", label: "Exams", icon: <FileText size={20} /> },
    { path: "/halls", label: "Halls", icon: <Building size={20} /> },
    { path: "/allocation", label: "Allocation", icon: <ListOrdered size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">Admin Portal</h1>
        </div>
        <nav className="mt-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 ${
                location.pathname === item.path ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600" : ""
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-red-600"
          >
            <span className="mr-3"><LogOut size={20} /></span>
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
