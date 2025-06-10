import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TabsContainer } from './components/TabsContainer';
import { RibbonMenu } from './components/RibbonMenu';
import { AlertDialog } from './components/AlertDialog';
import { PromptDialog } from './components/PromptDialog';
import { Note } from './types';

function App() {
  const [notes, setNotes] = useState<Note[]>([
    { id: '1', title: 'Новый документ', content: '' }
  ]);
  const [currentNoteId, setCurrentNoteId] = useState<string>('1');
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Состояния для диалоговых окон
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
  });

  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm?: (value: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Функции для работы с диалогами
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    setAlertDialog({
      isOpen: true,
      message,
      type,
      title,
    });
  };

  const showPrompt = (
    title: string,
    message: string,
    defaultValue: string = '',
    placeholder: string = ''
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptDialog({
        isOpen: true,
        title,
        message,
        defaultValue,
        placeholder,
        onConfirm: (value: string) => {
          setPromptDialog(prev => ({ ...prev, isOpen: false }));
          resolve(value);
        },
      });
    });
  };

  const closePrompt = () => {
    setPromptDialog(prev => ({ ...prev, isOpen: false }));
    if (promptDialog.onConfirm) {
      // Resolve with null when cancelled
      setTimeout(() => {
        // This is a workaround since we can't directly access the promise resolve
      }, 0);
    }
  };

  // Функции для сохранения и восстановления позиции курсора
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (selectionRef.current && editorRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        try {
          // Проверяем, что range все еще валиден
          if (editorRef.current.contains(selectionRef.current.startContainer)) {
            selection.addRange(selectionRef.current);
          } else {
            // Если range невалиден, устанавливаем курсор в конец редактора
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            selection.addRange(range);
            selectionRef.current = range;
          }
        } catch (error) {
          // Если произошла ошибка, устанавливаем курсор в конец
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.addRange(range);
          selectionRef.current = range;
        }
      }
    }
  }, []);

  // Функция для вставки HTML
  const insertHTML = useCallback((htmlString: string) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;
    
    // Используем сохраненный range или создаем новый
    if (selectionRef.current && editorRef.current.contains(selectionRef.current.startContainer)) {
      range = selectionRef.current;
    } else {
      // Если нет сохраненного range, создаем новый в конце редактора
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }

    // Удаляем текущее выделение, если оно есть
    range.deleteContents();

    // Создаем временный элемент для парсинга HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Вставляем все дочерние узлы
    const fragment = document.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }

    range.insertNode(fragment);

    // Устанавливаем курсор в конец вставленного содержимого
    range.collapse(false);
    
    // Обновляем выделение
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range;

    // Фокусируемся на редакторе
    editorRef.current.focus();
  }, []);

  // Загрузка заметок из localStorage при первом рендере
  useEffect(() => {
    const savedNotes = localStorage.getItem('textEditorNotes');
    const savedCurrentNoteId = localStorage.getItem('textEditorCurrentNoteId');
    
    if (savedNotes) {
      try {
        const parsedNotes = JSON.parse(savedNotes);
        if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
          setNotes(parsedNotes);
          if (savedCurrentNoteId && parsedNotes.find(note => note.id === savedCurrentNoteId)) {
            setCurrentNoteId(savedCurrentNoteId);
          } else {
            setCurrentNoteId(parsedNotes[0].id);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке заметок из localStorage:', error);
      }
    }
  }, []);

  // Сохранение заметок в localStorage с задержкой в 1 секунду
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('textEditorNotes', JSON.stringify(notes));
      localStorage.setItem('textEditorCurrentNoteId', currentNoteId);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, currentNoteId]);

  // Обновление содержимого редактора при смене заметки
  useEffect(() => {
    const currentNote = notes.find(note => note.id === currentNoteId);
    if (currentNote && editorRef.current) {
      editorRef.current.innerHTML = currentNote.content;
    }
  }, [currentNoteId, notes]);

  const onSwitchNote = (noteId: string) => {
    setCurrentNoteId(noteId);
  };

  const onDeleteTab = (noteId: string) => {
    if (notes.length <= 1) return;
    
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    
    if (currentNoteId === noteId) {
      setCurrentNoteId(updatedNotes[0].id);
    }
  };

  const onAddTab = () => {
    const newId = Date.now().toString();
    const newNote: Note = {
      id: newId,
      title: `Документ ${notes.length + 1}`,
      content: ''
    };
    
    setNotes(prevNotes => [...prevNotes, newNote]);
    setCurrentNoteId(newId);
  };

  const currentNote = notes.find(note => note.id === currentNoteId);

  const updateNoteContent = useCallback((content: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === currentNoteId 
          ? { ...note, content }
          : note
      )
    );
  }, [currentNoteId]);

  const updateNoteTitle = (title: string) => {
    setNotes(prevNotes => 
      prevNotes.map(note => 
        note.id === currentNoteId 
          ? { ...note, title }
          : note
      )
    );
  };

  // Функции для форматирования текста
  const handleFormatText = (command: string, value?: string) => {
    if (!editorRef.current) return;

    // Сохраняем текущее выделение
    saveSelection();

    // Для команды insertHTML используем нашу кастомную функцию
    if (command === 'insertHTML' && value) {
      insertHTML(value);
    } else {
      // Для остальных команд используем document.execCommand
      document.execCommand(command, false, value);
      // Восстанавливаем фокус на редакторе
      editorRef.current.focus();
    }
    
    // Обновляем содержимое заметки с debounce
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      const content = editorRef.current?.innerHTML || '';
      updateNoteContent(content);
    }, 300);
  };

  const handleSave = () => {
    if (currentNote) {
      // Сохранение в формате HTML
      const blob = new Blob([currentNote.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentNote.title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showAlert('Документ сохранен в формате HTML!', 'success');
    }
  };

  const handleSaveAsTxt = () => {
    if (currentNote) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = currentNote.content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentNote.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showAlert('Документ сохранен в формате TXT!', 'success');
    }
  };

  const handleShareAsJson = () => {
    const dataToShare = {
      notes: notes,
      currentNoteId: currentNoteId,
      exportDate: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(dataToShare, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-editor-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('Данные экспортированы в JSON!', 'success');
  };

  const handleImportJson = (jsonString: string) => {
    try {
      const importedData = JSON.parse(jsonString);
      
      if (importedData.notes && Array.isArray(importedData.notes) && importedData.notes.length > 0) {
        const validNotes = importedData.notes.filter((note: any) => 
          note.id && note.title !== undefined && note.content !== undefined
        );
        
        if (validNotes.length > 0) {
          const notesWithNewIds = validNotes.map((note: Note) => ({
            ...note,
            id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }));
          
          setNotes(prevNotes => [...prevNotes, ...notesWithNewIds]);
          setCurrentNoteId(notesWithNewIds[0].id);
          
          showAlert(`Успешно импортировано ${notesWithNewIds.length} заметок!`, 'success');
        } else {
          showAlert('В файле не найдено валидных заметок для импорта.', 'error');
        }
      } else {
        showAlert('Неверный формат JSON файла. Ожидается объект с массивом заметок.', 'error');
      }
    } catch (error) {
      console.error('Ошибка при импорте JSON:', error);
      showAlert('Ошибка при чтении JSON файла. Проверьте формат файла.', 'error');
    }
  };

  const handleInsertLocalImage = (dataUrl: string) => {
    const imgHTML = `<img src="${dataUrl}" alt="Загруженное изображение" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
    handleFormatText('insertHTML', imgHTML);
  };

  const handleInsertTable = async () => {
    const rows = await showPrompt('Создание таблицы', 'Количество строк:', '3');
    if (!rows || isNaN(parseInt(rows))) return;
    
    const cols = await showPrompt('Создание таблицы', 'Количество столбцов:', '3');
    if (!cols || isNaN(parseInt(cols))) return;
    
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
    
    for (let i = 0; i < parseInt(rows); i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < parseInt(cols); j++) {
        tableHTML += '<td style="padding: 8px; border: 1px solid #ccc;">&nbsp;</td>';
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</table>';
    
    handleFormatText('insertHTML', tableHTML);
  };

  const handleInsertLink = async () => {
    const url = await showPrompt('Вставка ссылки', 'Введите URL:');
    if (!url) return;
    
    const text = await showPrompt('Вставка ссылки', 'Введите текст ссылки:');
    if (!text) return;
    
    const linkHTML = `<a href="${url}" target="_blank">${text}</a>`;
    handleFormatText('insertHTML', linkHTML);
  };

  const handleInsertImage = async () => {
    const url = await showPrompt('Вставка изображения', 'Введите URL изображения:');
    if (!url) return;
    
    const alt = await showPrompt('Вставка изображения', 'Введите описание изображения:', 'Изображение');
    
    const imgHTML = `<img src="${url}" alt="${alt || 'Изображение'}" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
    handleFormatText('insertHTML', imgHTML);
  };

  // Функции для работы с таблицами
  const findCurrentTableCell = (): HTMLTableCellElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    let element = selection.getRangeAt(0).startContainer;
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentNode!;
    }
    
    while (element && element !== editorRef.current) {
      if (element.nodeName === 'TD' || element.nodeName === 'TH') {
        return element as HTMLTableCellElement;
      }
      element = element.parentNode!;
    }
    
    return null;
  };

  const handleAddRow = () => {
    const cell = findCurrentTableCell();
    if (!cell) {
      showAlert('Поместите курсор в таблицу для добавления строки.', 'error');
      return;
    }
    
    const row = cell.parentNode as HTMLTableRowElement;
    const table = row.closest('table');
    if (!table) return;
    
    const newRow = row.cloneNode(true) as HTMLTableRowElement;
    const cells = newRow.querySelectorAll('td, th');
    cells.forEach(cell => {
      cell.innerHTML = '&nbsp;';
    });
    
    row.parentNode!.insertBefore(newRow, row.nextSibling);
    
    const content = editorRef.current?.innerHTML || '';
    updateNoteContent(content);
  };

  const handleDeleteRow = () => {
    const cell = findCurrentTableCell();
    if (!cell) {
      showAlert('Поместите курсор в таблицу для удаления строки.', 'error');
      return;
    }
    
    const row = cell.parentNode as HTMLTableRowElement;
    const table = row.closest('table');
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    if (rows.length <= 1) {
      showAlert('Нельзя удалить последнюю строку таблицы.', 'error');
      return;
    }
    
    row.remove();
    
    const content = editorRef.current?.innerHTML || '';
    updateNoteContent(content);
  };

  const handleAddColumn = () => {
    const cell = findCurrentTableCell();
    if (!cell) {
      showAlert('Поместите курсор в таблицу для добавления столбца.', 'error');
      return;
    }
    
    const table = cell.closest('table');
    if (!table) return;
    
    const cellIndex = Array.from(cell.parentNode!.children).indexOf(cell);
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
      const newCell = document.createElement(cell.nodeName.toLowerCase() as 'td' | 'th');
      newCell.innerHTML = '&nbsp;';
      newCell.style.cssText = 'padding: 8px; border: 1px solid #ccc;';
      
      if (cellIndex + 1 < row.children.length) {
        row.insertBefore(newCell, row.children[cellIndex + 1]);
      } else {
        row.appendChild(newCell);
      }
    });
    
    const content = editorRef.current?.innerHTML || '';
    updateNoteContent(content);
  };

  const handleDeleteColumn = () => {
    const cell = findCurrentTableCell();
    if (!cell) {
      showAlert('Поместите курсор в таблицу для удаления столбца.', 'error');
      return;
    }
    
    const table = cell.closest('table');
    if (!table) return;
    
    const cellIndex = Array.from(cell.parentNode!.children).indexOf(cell);
    const rows = table.querySelectorAll('tr');
    
    // Проверяем, что это не последний столбец
    if (rows[0] && rows[0].children.length <= 1) {
      showAlert('Нельзя удалить последний столбец таблицы.', 'error');
      return;
    }
    
    rows.forEach(row => {
      if (row.children[cellIndex]) {
        row.children[cellIndex].remove();
      }
    });
    
    const content = editorRef.current?.innerHTML || '';
    updateNoteContent(content);
  };

  // Обработка изменений в редакторе
  const handleEditorChange = () => {
    if (editorRef.current) {
      saveSelection();
      
      // Debounced update
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        const content = editorRef.current?.innerHTML || '';
        updateNoteContent(content);
      }, 300);
    }
  };

  // Обработка горячих клавиш
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleSave();
          break;
        case 'b':
          e.preventDefault();
          handleFormatText('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormatText('italic');
          break;
        case 'u':
          e.preventDefault();
          handleFormatText('underline');
          break;
        case 'z':
          e.preventDefault();
          handleFormatText('undo');
          break;
        case 'y':
          e.preventDefault();
          handleFormatText('redo');
          break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TabsContainer
        notes={notes}
        currentNoteId={currentNoteId}
        onSwitchNote={onSwitchNote}
        onDeleteTab={onDeleteTab}
        onAddTab={onAddTab}
      />
      
      <RibbonMenu
        onFormatText={handleFormatText}
        onSave={handleSave}
        onSaveAsTxt={handleSaveAsTxt}
        onShareAsJson={handleShareAsJson}
        onImportJson={handleImportJson}
        onInsertTable={handleInsertTable}
        onInsertLink={handleInsertLink}
        onInsertImage={handleInsertImage}
        onInsertLocalImage={handleInsertLocalImage}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
        onAddColumn={handleAddColumn}
        onDeleteColumn={handleDeleteColumn}
      />
      
      <div className="flex-1 bg-white">
        {currentNote && (
          <div className="h-full flex flex-col">
            {/* Заголовок документа - уменьшена высота вдвое */}
            <div className="border-b border-gray-200 p-2">
              <input
                type="text"
                value={currentNote.title}
                onChange={(e) => updateNoteTitle(e.target.value)}
                className="text-2xl font-bold w-full border-none outline-none bg-transparent"
                placeholder="Название документа..."
              />
            </div>
            
            {/* Область редактирования */}
            <div className="flex-1 p-4">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorChange}
                onKeyDown={handleKeyDown}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                className="w-full h-full outline-none text-gray-800 leading-relaxed"
                style={{ 
                  minHeight: 'calc(100vh - 300px)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  direction: 'ltr',
                  textAlign: 'left',
                  unicodeBidi: 'normal'
                }}
                suppressContentEditableWarning={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* Диалоговые окна */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <PromptDialog
        isOpen={promptDialog.isOpen}
        title={promptDialog.title}
        message={promptDialog.message}
        defaultValue={promptDialog.defaultValue}
        placeholder={promptDialog.placeholder}
        onConfirm={(value) => {
          if (promptDialog.onConfirm) {
            promptDialog.onConfirm(value);
          }
        }}
        onCancel={closePrompt}
      />
    </div>
  );
}

export default App;