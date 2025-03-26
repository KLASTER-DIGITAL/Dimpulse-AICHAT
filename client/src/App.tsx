import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Cabinet from "@/pages/Cabinet";
import ProtectedRoute from "@/components/ProtectedRoute";
import UIStyleProvider from "@/components/ChatGPT/UIStyleProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat/:id" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/cabinet">
        {() => (
          <ProtectedRoute>
            <Cabinet />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UIStyleProvider>
        <Router />
        <Toaster />
      </UIStyleProvider>
    </QueryClientProvider>
  );
}

export default App;
