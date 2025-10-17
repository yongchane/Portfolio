export interface Project {
  id: string;
  title: string;
  description: string;
  role: string;
  imageUrl: string;
  period: string;
  tags: string[];
  achievement: string;
  link?: string;
  github?: string;
  image?: string;
}

export interface TechStack {
  category: string;
  items: TechItem[];
}

export interface TechItem {
  name: string;
  proficiency: number; // 0-100
  experience: string;
  icon?: string;
}

export interface Experience {
  company: string;
  position: string;
  period: string;
  description: string;
}
