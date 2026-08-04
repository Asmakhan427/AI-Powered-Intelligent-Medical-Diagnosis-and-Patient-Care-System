export interface EducationArticle {
  title: string;
  text: string;
  image: string;
  precautions: string;
}

const EDUCATION_CONTENT: Record<string, EducationArticle> = {
  migraine: {
    title: 'Understanding Migraines',
    text: 'Migraines are severe headaches often accompanied by nausea, vomiting, and extreme sensitivity to light and sound.',
    image: 'https://images.pexels.com/photos/3938022/pexels-photo-3938022.jpeg?w=600',
    precautions:
      '• Consult a neurologist\n• Avoid triggers like bright lights and loud noises\n• Maintain regular sleep schedule\n• Stay hydrated\n• Consider preventive medications',
  },
  heart: {
    title: 'Cardiovascular Health',
    text: 'Chest pain or shortness of breath should always be taken seriously. Regular exercise promotes heart health.',
    image: 'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?w=600',
    precautions:
      '• Consult a cardiologist immediately\n• Monitor blood pressure regularly\n• Maintain a heart-healthy diet\n• Exercise regularly\n• Quit smoking if applicable',
  },
  cold: {
    title: 'Managing Viral Infections',
    text: 'Viral infections like colds and the flu do not respond to antibiotics. Rest and hydration are key.',
    image:
      'https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg?w=600',
    precautions:
      '• Get plenty of rest\n• Stay hydrated\n• Use over-the-counter remedies for symptoms\n• Avoid contact with others\n• Wash hands frequently',
  },
  general: {
    title: 'General Wellness',
    text: 'Stay hydrated, aim for 7-9 hours of sleep, manage stress, and eat a balanced diet.',
    image:
      'https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg?w=600',
    precautions:
      '• Regular check-ups\n• Balanced diet\n• Regular exercise\n• Adequate sleep\n• Stress management',
  },
};

export function getEducationArticle(topic: string): EducationArticle {
  return EDUCATION_CONTENT[topic] || EDUCATION_CONTENT.general;
}
