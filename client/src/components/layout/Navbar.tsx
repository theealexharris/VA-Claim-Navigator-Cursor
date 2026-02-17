import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useCallback } from "react";

function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) {
  e.preventDefault();
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function Navbar() {
  const [location] = useLocation();
  const isPublic = location === "/" || location === "/login" || location === "/signup";

  if (!isPublic) return null;

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-serif font-bold text-3xl text-primary">
          <img src="/favicon.png" alt="VA Claim Navigator" className="h-8 w-8 object-contain" />
          <span>VA Claim Navigator</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer">Features</a>
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer">How it Works</a>
          <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer">Pricing</a>
          <div className="flex items-center gap-4 ml-4">
            <Link href="/login">
              <span className="inline-block">
                <Button variant="ghost" className="font-semibold text-primary">Log In</Button>
              </span>
            </Link>
            <Link href="/signup">
              <span className="inline-block">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md">
                  Get Started
                </Button>
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-6 mt-8">
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="text-lg font-medium cursor-pointer">Features</a>
                <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="text-lg font-medium cursor-pointer">How it Works</a>
                <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="text-lg font-medium cursor-pointer">Pricing</a>
                <Link href="/login">
                  <span className="block w-full">
                    <Button variant="outline" className="w-full justify-start">Log In</Button>
                  </span>
                </Link>
                <Link href="/signup">
                  <span className="block w-full">
                    <Button className="w-full bg-primary text-primary-foreground">Get Started</Button>
                  </span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
