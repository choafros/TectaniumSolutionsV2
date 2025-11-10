"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatHoursAndMinutes } from "@/lib/utils";

// Define the type for a project based on your schema
interface Project {
  id: number;
  name: string;
  location: string;
  hourlyRate: string; // Keep for form submission, but won't display in the table
  totalHours: string;
}

// Function to fetch projects from our new API route
async function getProjects(): Promise<Project[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) {
        // This will be caught by the calling function
        throw new Error('Failed to fetch projects. Please ensure the server is running and the API route exists.');
    }
    return res.json();
}


export default function ProjectsPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLocation, setNewProjectLocation] = useState('');
    const [newProjectRate, setNewProjectRate] = useState('');

    const fetchAndSetProjects = async () => {
        try {
            setIsLoading(true);
            const fetchedProjects = await getProjects();
            setProjects(fetchedProjects);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAndSetProjects();
    }, []);

    const handleAddProject = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newProjectName, 
                    location: newProjectLocation, 
                    hourlyRate: newProjectRate 
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                // Display server-side validation errors if they exist
                const errorMessage = data.errors ? JSON.stringify(data.errors) : (data.message || 'Failed to add project');
                throw new Error(errorMessage);
            }

            // Refresh project list on success
            await fetchAndSetProjects();

            // Clear form fields
            setNewProjectName('');
            setNewProjectLocation('');
            setNewProjectRate('');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };

    const handleDelete = async (id: number) => {
    try {
        const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        });

        if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete project');
        }

        // Refresh list
        await fetchAndSetProjects();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error while deleting');
    }
    };

    if (isLoading) return <div>Loading projects...</div>;

    return (
        <div className="grid gap-6">
            {/* Conditionally render the form for admins only */}
            {user?.role === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Project</CardTitle>
                        <CardDescription>Fill in the details to create a new project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddProject} className="grid gap-4 md:grid-cols-3 items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input id="name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" value={newProjectLocation} onChange={e => setNewProjectLocation(e.target.value)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rate">Hourly Rate (£)</Label>
                                <Input id="rate" type="number" step="0.01" value={newProjectRate} onChange={e => setNewProjectRate(e.target.value)} required />
                            </div>
                            <div className="md:col-start-3">
                                <Button type="submit" className="w-full">Add Project</Button>
                            </div>
                        </form>
                         {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Projects</CardTitle>
                    <CardDescription>A list of all active projects.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && !isLoading && <p className="text-red-500">{error}</p>}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Location</th>
                                    <th scope="col" className="px-6 py-3">Total Hours</th>
                                    <th scope="col" className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!isLoading && !error && projects.length > 0 ? projects.map(p => (
                                    <tr key={p.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                        <td className="px-6 py-4">{p.location}</td>
                                        <td className="px-6 py-4">{formatHoursAndMinutes(p.totalHours)}</td>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(p.id)}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={2} className="text-center py-4 text-gray-500">
                                            {/* Show a different message based on whether there was an error or just no data */}
                                            {isLoading ? "Loading..." : (error ? "Could not load projects." : "No projects found. Add one above to get started.")}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
