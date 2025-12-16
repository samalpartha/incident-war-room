import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import Button from '@atlaskit/button';
import Checkbox from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import SectionMessage from '@atlaskit/section-message';
import AddIcon from '@atlaskit/icon/glyph/add';
import TaskIcon from '@atlaskit/icon/glyph/task';
import { token } from '@atlaskit/tokens';

function WarRoomPanel() {
    const [checklist, setChecklist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isGlobal, setIsGlobal] = useState(false);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        invoke('getChecklist').then((data) => {
            if (data && data.isGlobal) {
                setIsGlobal(true);
            } else {
                setChecklist(data);
            }
            setLoading(false);
        }).catch((err) => {
            console.error("Failed to load checklist", err);
            setLoading(false);
        });
    }, []);

    const toggleItem = (index) => {
        const newItems = [...checklist];
        newItems[index].done = !newItems[index].done;
        setChecklist(newItems);
        invoke('updateChecklist', { items: newItems });
    };

    const handleAddTask = () => {
        if (!newTask.trim()) return;
        const newItems = [...checklist, { text: newTask, done: false }];
        setChecklist(newItems);
        setNewTask('');
        invoke('updateChecklist', { items: newItems });
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
    }

    if (isGlobal) {
        return (
            <div style={{ padding: '20px' }}>
                <SectionMessage appearance="success" title="App Installed Successfully">
                    <p>Welcome to the <strong>Incident War Room</strong>.</p>
                    <p>To use the checklist, please navigate to a <strong>Jira Issue</strong> and open the panel there.</p>
                </SectionMessage>
            </div>
        );
    }

    return (
        <div style={{ padding: '4px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TaskIcon label="War Room" size="medium" />
                <h3 style={{ margin: 0 }}>Incident Response Checklist</h3>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Textfield
                    placeholder="Add a new task..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <Button appearance="primary" iconBefore={<AddIcon label="add" />} onClick={handleAddTask}>
                    Add
                </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {checklist.map((item, idx) => (
                    <div key={idx} style={{
                        padding: '8px',
                        backgroundColor: token('elevation.surface.raised', '#fff'),
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Checkbox
                            isChecked={item.done}
                            onChange={() => toggleItem(idx)}
                            label={
                                <span style={{
                                    textDecoration: item.done ? 'line-through' : 'none',
                                    color: item.done ? token('color.text.disabled', '#6B778C') : token('color.text', '#172B4D')
                                }}>
                                    {item.text}
                                </span>
                            }
                        />
                    </div>
                ))}
                {checklist.length === 0 && (
                    <div style={{ textAlign: 'center', color: token('color.text.subtlest', '#6B778C'), padding: '20px' }}>
                        No tasks yet. Add one above!
                    </div>
                )}
            </div>
        </div>
    );
}

export default WarRoomPanel;
