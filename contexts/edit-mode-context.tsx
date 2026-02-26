import { createContext, useContext, useState, ReactNode } from 'react';

type EditModeContextType = {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  toggleEditMode: () => void;
};

const EditModeContext = createContext<EditModeContextType | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => {
    setIsEditMode(prev => !prev);
  };

  return (
    <EditModeContext.Provider value={{ isEditMode, setIsEditMode, toggleEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);

  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }

  return context;
}
