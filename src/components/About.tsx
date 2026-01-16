import { CheckCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const values = [
  "Confidential and judgment-free environment",
  "Evidence-based therapeutic approaches",
  "Experienced and licensed professionals",
  "Flexible scheduling including evenings and weekends",
];

export function About() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          <div>
            <h2 className="text-slate-900 mb-6">
              About Our Practice
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              For over 15 years, our psychology clinic has been a trusted partner in mental health care, 
              providing compassionate and professional support to individuals, couples, and families.
            </p>
            <p className="text-slate-600 mb-8 leading-relaxed">
              We believe that seeking help is a sign of strength. Our team is committed to creating 
              a welcoming space where you can explore your thoughts and feelings without judgment, 
              working together towards lasting positive change.
            </p>
            
            <div className="space-y-4">
              {values.map((value, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-lg overflow-hidden shadow-xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1620302044935-444961a5d028?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwc3ljaG9sb2d5JTIwY2xpbmljJTIwcmVjZXB0aW9ufGVufDF8fHx8MTc2Mzg1MTkxNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Our welcoming clinic space"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}