import { Github, Mail } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <a href="https://github.com/prateek-mehra" rel="noreferrer" target="_blank" title="GitHub">
        <Github size={18} />
      </a>
      <a href="mailto:partumehra@gmail.com" title="Email">
        <Mail size={18} />
      </a>
    </footer>
  );
}
