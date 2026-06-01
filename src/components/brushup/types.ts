export type Subject = {
  id: string;
  icon: string;
  name: string;
  emoji: string;
};

export type Card = {
  id: string;
  title: string;
  subject: string;
  description: string;
  progress: number;
  daysAgo: number;
  quiz_id?: number;
};
