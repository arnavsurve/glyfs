import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Bot, BarChart3, Zap, Shield, ArrowRight, Github } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Bot,
      title: "AI Agent Management",
      description: "Create and manage intelligent agents powered by leading AI models from Anthropic, OpenAI, and Google."
    },
    {
      icon: BarChart3,
      title: "Usage Analytics",
      description: "Track your agent performance with detailed metrics, token usage, and cost analytics."
    },
    {
      icon: Zap,
      title: "API Integration",
      description: "Seamlessly integrate your agents into applications with our robust REST API."
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with reliable infrastructure for your AI workloads."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">Glyfs</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
              <Button onClick={() => navigate("/signup")}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Build Powerful{" "}
            <span className="text-primary">AI Agents</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create, manage, and deploy intelligent agents with ease. 
            Connect to multiple AI providers and build the next generation of AI-powered applications.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/signup")}
              className="flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to build with AI
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools and features to help you create, deploy, and manage AI agents at scale.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Connect to Leading AI Providers
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Choose from the best AI models available and switch between providers seamlessly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center p-6 rounded-lg border border-border">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">A</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Anthropic</h3>
              <p className="text-muted-foreground text-center">Claude models for advanced reasoning and analysis</p>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-lg border border-border">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">O</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">OpenAI</h3>
              <p className="text-muted-foreground text-center">GPT models for versatile AI applications</p>
            </div>
            
            <div className="flex flex-col items-center p-6 rounded-lg border border-border">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">G</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Google</h3>
              <p className="text-muted-foreground text-center">Gemini models for multimodal AI capabilities</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to build your first AI agent?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of developers already building the future with Glyfs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/signup")}
              className="flex items-center gap-2"
            >
              Start Building Free
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <h3 className="text-xl font-bold">Glyfs</h3>
              <span className="text-muted-foreground">© 2025</span>
            </div>
            <div className="flex items-center space-x-6">
              <Button variant="ghost" size="sm">
                Documentation
              </Button>
              <Button variant="ghost" size="sm">
                Support
              </Button>
              <Button variant="ghost" size="sm">
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}