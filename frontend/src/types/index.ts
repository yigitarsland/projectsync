import { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  firebaseUid: string;
  email: string;
  name: string;
  role: 'project_manager' | 'team_member';
  createdAt: Date;
}

export interface Project {
  _id: ObjectId;
  name: string;
  description?: string;
  ownerId: ObjectId;
  members: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Subtask {
  _id: ObjectId;
  title: string;
  status: string;
  assigneeId?: ObjectId;
  dueDate?: Date;
}

export interface Task {
  _id: ObjectId;
  projectId: ObjectId;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: ObjectId;
  dueDate?: Date;
  startDate?: Date;
  subtasks: Subtask[];
  dependencies: ObjectId[];
  showSubtasks?: boolean;
}