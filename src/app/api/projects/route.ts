import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { projects } from '@/lib/db/schema';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Use Zod for robust validation of the incoming request body
const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  location: z.string().min(2, "Location is required"),
  hourlyRate: z.string().refine(val => !isNaN(parseFloat(val)), { message: "Hourly rate must be a valid number" }),
});

// GET handler to fetch all projects
export async function GET() {
  try {
    const allProjects = await db.query.projects.findMany();
    return NextResponse.json(allProjects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ message: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST handler to create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = projectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, location, hourlyRate } = validation.data;

    const newProject = await db
      .insert(projects)
      .values({
        name,
        location,
        hourlyRate,
      })
      .returning();
      
    // This tells Next.js to refresh the data on the projects page
    revalidatePath('/dashboard/projects');

    return NextResponse.json({ project: newProject[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ message: 'Failed to create project' }, { status: 500 });
  }
}