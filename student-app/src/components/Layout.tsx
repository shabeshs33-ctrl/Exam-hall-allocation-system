import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, User, FileText, ListOrdered, LogOut } from "lucide-react";

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/profile", label: "My Profile", icon: <User size={20} /> },
    { path: "/exams", label: "Exam Details", icon: <FileText size={20} /> },
    { path: "/allocation", label: "Hall Allocation", icon: <ListOrdered size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-green-600">Student Portal</h1>
        </div>
        <nav className="mt-6 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 hover:text-green-600 ${
                location.pathname === item.path ? "bg-green-50 text-green-600 border-r-4 border-green-600" : ""
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mb-4">
          <button
            onClick={logout}
            className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600"
          >
            <span className="mr-3"><LogOut size={20} /></span>
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
