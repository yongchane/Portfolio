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
  theis?: string;
  figma?: string;
  github?: string;
  image?: string;
}

export interface Award {
  id: string;
  type: "paper" | "award";
  title: string;
  organization: string;
  date: string;
  description: string;
  link?: string;
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
  id: string;
  company: string;
  position: string;
  type: "freelance" | "fulltime" | "parttime" | "internship";
  period: string;
  description: string;
  highlights?: string[]; // 핵심 작업 영역 - 시각적 칩으로 표시
  achievement: string;
  tags: string[];
  imageUrl?: string;
  link?: string;
  github?: string;
}
