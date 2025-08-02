export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:ml-64">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span> © {new Date().getFullYear()} Paycrypt</span>
            <span>•</span>
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Version 1.0.0</span>
            <span>•</span>
            <a href="/support" className="hover:text-foreground">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
