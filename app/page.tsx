
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import type { Chart as ChartJS } from 'chart.js';

// TYPES
type Exercise = {
    name: string;
    muscleGroup: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';
    equipment: 'Barbell' | 'Dumbbell' | 'Kettlebell' | 'Machine' | 'Bodyweight';
};

type WorkoutExercise = Exercise & {
    id: number;
    sets: number;
    reps: number;
    weight: number;
};

type WorkoutTemplate = {
    name: string;
    plan: WorkoutExercise[];
};

export default function WorkoutPlanner() {
    // STATE HOOKS
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeView, setActiveView] = useState<'planner' | 'dashboard'>('planner');
    const [workoutPlan, setWorkoutPlan] = useState<WorkoutExercise[]>([]);
    const [activeMuscleFilter, setActiveMuscleFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    
    // New Feature State
    const [planName, setPlanName] = useState('My Workout');
    const [savedTemplates, setSavedTemplates] = useState<WorkoutTemplate[]>([]);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<number | null>(null);

    // REFS FOR CHARTS
    const muscleChartRef = useRef<HTMLCanvasElement>(null);
    const equipmentChartRef = useRef<HTMLCanvasElement>(null);
    const muscleChartInstance = useRef<ChartJS<'pie'> | null>(null);
    const equipmentChartInstance = useRef<ChartJS<'bar'> | null>(null);

    // CENTRALIZED DATA OBJECT
    const data = {
        exercises: [
            { name: 'Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
            { name: 'Push Up', muscleGroup: 'Chest', equipment: 'Bodyweight' },
            { name: 'Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell' },
            { name: 'Pull Up', muscleGroup: 'Back', equipment: 'Bodyweight' },
            { name: 'Bent Over Row', muscleGroup: 'Back', equipment: 'Barbell' },
            { name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Machine' },
            { name: 'Squat', muscleGroup: 'Legs', equipment: 'Barbell' },
            { name: 'Lunge', muscleGroup: 'Legs', equipment: 'Dumbbell' },
            { name: 'Leg Press', muscleGroup: 'Legs', equipment: 'Machine' },
            { name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
            { name: 'Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
            { name: 'Bicep Curl', muscleGroup: 'Arms', equipment: 'Dumbbell' },
            { name: 'Tricep Extension', muscleGroup: 'Arms', equipment: 'Dumbbell' },
            { name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight' },
            { name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight' },
        ] as Exercise[],
        muscleGroups: ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'],
        equipmentTypes: ['Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Bodyweight']
    };
    
    // LOCALSTORAGE PERSISTENCE
    useEffect(() => {
        try {
            const savedPlan = localStorage.getItem('workoutPlan');
            const savedName = localStorage.getItem('workoutPlanName');
            const savedTpls = localStorage.getItem('workoutTemplates');
            if (savedPlan) setWorkoutPlan(JSON.parse(savedPlan));
            if (savedName) setPlanName(savedName);
            if (savedTpls) setSavedTemplates(JSON.parse(savedTpls));
        } catch (error) { console.error("Failed to load data from storage", error); }
    }, []);

    useEffect(() => { localStorage.setItem('workoutPlan', JSON.stringify(workoutPlan)); }, [workoutPlan]);
    useEffect(() => { localStorage.setItem('workoutPlanName', planName); }, [planName]);
    useEffect(() => { localStorage.setItem('workoutTemplates', JSON.stringify(savedTemplates)); }, [savedTemplates]);


    // HANDLER FUNCTIONS
    const addExerciseToPlan = (exercise: Exercise) => {
        if (!workoutPlan.find(e => e.name === exercise.name)) {
            const newExercise: WorkoutExercise = { ...exercise, id: Date.now(), sets: 3, reps: 10, weight: 20 };
            setWorkoutPlan([...workoutPlan, newExercise]);
        }
    };

    const removeExerciseFromPlan = (id: number) => { setWorkoutPlan(workoutPlan.filter(e => e.id !== id)); };

    const handlePlanUpdate = (id: number, field: 'sets' | 'reps' | 'weight', value: number) => {
        setWorkoutPlan(workoutPlan.map(ex => ex.id === id ? { ...ex, [field]: value } : ex ));
    };

    const clearPlan = () => { if (window.confirm("Are you sure? This will clear the current plan but not your saved templates.")) { setWorkoutPlan([]); setPlanName('New Workout'); } };
    
    const handleSaveTemplate = () => {
        if (!planName.trim()) { alert("Please enter a name for the plan."); return; }
        const newTemplate = { name: planName, plan: workoutPlan };
        setSavedTemplates(prev => [...prev.filter(t => t.name !== planName), newTemplate]);
        setIsTemplatesModalOpen(false);
    };

    const handleLoadTemplate = (template: WorkoutTemplate) => {
        setPlanName(template.name);
        setWorkoutPlan(template.plan);
        setIsTemplatesModalOpen(false);
    };

    const handleDeleteTemplate = (templateName: string) => {
        if (window.confirm(`Delete template "${templateName}"?`)) {
            setSavedTemplates(prev => prev.filter(t => t.name !== templateName));
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetId: number) => {
        e.preventDefault();
        if (draggedItemId === null || draggedItemId === dropTargetId) return;
        
        const newPlan = [...workoutPlan];
        const draggedIndex = newPlan.findIndex(item => item.id === draggedItemId);
        const dropIndex = newPlan.findIndex(item => item.id === dropTargetId);

        const [draggedItem] = newPlan.splice(draggedIndex, 1);
        newPlan.splice(dropIndex, 0, draggedItem);
        
        setWorkoutPlan(newPlan);
        setDraggedItemId(null);
    };
    
    // CHART RENDERING LOGIC
    const renderCharts = useCallback(() => {
        if (muscleChartInstance.current) muscleChartInstance.current.destroy();
        if (equipmentChartInstance.current) equipmentChartInstance.current.destroy();

        const muscleCounts = data.muscleGroups.filter(g => g !== 'All').reduce((acc, group) => {
            acc[group] = workoutPlan.filter(ex => ex.muscleGroup === group).length;
            return acc;
        }, {} as Record<string, number>);

        const equipmentCounts = data.equipmentTypes.reduce((acc, type) => {
            acc[type] = workoutPlan.filter(ex => ex.equipment === type).length;
            return acc;
        }, {} as Record<string, number>);

        if (muscleChartRef.current) {
            muscleChartInstance.current = new Chart(muscleChartRef.current, {
                type: 'pie',
                data: {
                    labels: Object.keys(muscleCounts),
                    datasets: [{
                        data: Object.values(muscleCounts),
                        backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
                        borderColor: '#1F2937', borderWidth: 2,
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: '#D1D5DB' } } } }
            });
        }
        
        if (equipmentChartRef.current) {
            equipmentChartInstance.current = new Chart(equipmentChartRef.current, {
                type: 'bar',
                data: {
                    labels: Object.keys(equipmentCounts),
                    datasets: [{
                        label: 'Exercises per Equipment',
                        data: Object.values(equipmentCounts),
                        backgroundColor: 'rgba(20, 184, 166, 0.6)',
                        borderColor: 'rgba(13, 148, 136, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    scales: { x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' } }, y: { ticks: { color: '#D1D5DB' } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }, [workoutPlan, data.muscleGroups, data.equipmentTypes]);

    useEffect(() => { if (activeView === 'dashboard') { renderCharts(); } }, [activeView, renderCharts]);

    // DERIVED DATA & FILTERING
    const filteredExercises = data.exercises
        .filter(e => activeMuscleFilter === 'All' || e.muscleGroup === activeMuscleFilter)
        .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const dashboardStats = {
        totalExercises: workoutPlan.length,
        muscleGroupsTargeted: new Set(workoutPlan.map(e => e.muscleGroup)).size,
        totalVolume: workoutPlan.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0),
        primaryFocus: Object.entries(workoutPlan.reduce((acc, ex) => { acc[ex.muscleGroup] = (acc[ex.muscleGroup] || 0) + 1; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
    };
    
    // JSX
    return (
        <div className="bg-slate-900 text-slate-100 font-inter min-h-screen flex flex-col">
            <style jsx global>{`
                body { font-family: 'Inter', sans-serif; }
                .chart-container { position: relative; width: 100%; height: 350px; }
            `}</style>
            
            <header className="bg-slate-800/80 backdrop-blur-lg sticky top-0 z-50 shadow-lg">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center"><span className="font-bold text-xl text-teal-400">Workout Planner</span></div>
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-1">
                                <button onClick={() => setActiveView('planner')} className={`${activeView === 'planner' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-700'} px-3 py-2 rounded-md text-sm font-medium`}>Planner</button>
                                <button onClick={() => setActiveView('dashboard')} className={`${activeView === 'dashboard' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-700'} px-3 py-2 rounded-md text-sm font-medium`}>Dashboard</button>
                            </div>
                        </div>
                        <div className="md:hidden">
                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none">
                                <span className="sr-only">Open main menu</span>
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </nav>
                <div className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <button 
                            onClick={() => { setActiveView('planner'); setMobileMenuOpen(false); }} 
                            className={`${activeView === 'planner' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-700'} block w-full text-left px-3 py-2 rounded-md text-base font-medium`}
                        >
                            Planner
                        </button>
                        <button 
                            onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }} 
                            className={`${activeView === 'dashboard' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-700'} block w-full text-left px-3 py-2 rounded-md text-base font-medium`}
                        >
                            Dashboard
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
                {activeView === 'planner' && (
                    <>
                        <section id="hero" className="text-center mb-12">
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">Build Your <span className="text-teal-400">Workout</span></h1>
                            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">Select exercises, add them to your plan, and set your reps and sets.</p>
                        </section>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <section id="library" className="bg-slate-800 p-6 rounded-lg shadow-xl">
                                <h2 className="text-2xl font-bold mb-4">Exercise Library</h2>
                                <input type="text" placeholder="Search exercises..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-700 p-2 rounded-md mb-4 focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {data.muscleGroups.map(group => (
                                        <button key={group} onClick={() => setActiveMuscleFilter(group)} className={`px-3 py-1 text-sm font-medium rounded-full border-2 transition-colors duration-200 ${activeMuscleFilter === group ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}`}>{group}</button>
                                    ))}
                                </div>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                    {filteredExercises.map(exercise => {
                                        const isInPlan = !!workoutPlan.find(e => e.name === exercise.name);
                                        return (
                                        <div key={exercise.name} className="bg-slate-700 p-3 rounded-md flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">{exercise.name}</h4>
                                                <p className="text-xs text-slate-400">{exercise.muscleGroup} / {exercise.equipment}</p>
                                            </div>
                                            <button onClick={() => addExerciseToPlan(exercise)} disabled={isInPlan} className="bg-teal-600 text-white text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center transition-all disabled:bg-slate-500 disabled:cursor-not-allowed hover:bg-teal-500 hover:scale-110" aria-label={`Add ${exercise.name} to plan`}>+</button>
                                        </div>
                                    )})}
                                </div>
                            </section>

                            <section id="plan" className="bg-slate-800 p-6 rounded-lg shadow-xl">
                                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                    <h2 className="text-2xl font-bold">Your Workout Plan</h2>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsTemplatesModalOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-sm px-3 py-1 rounded-md">Templates</button>
                                        <button onClick={clearPlan} className="text-sm text-rose-400 hover:text-rose-300">Clear</button>
                                    </div>
                                </div>
                                <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Workout Name (e.g., Push Day)" className="w-full bg-slate-700 p-2 rounded-md mb-4 text-lg font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"/>
                                
                                <div className="space-y-4 max-h-[660px] overflow-y-auto pr-2">
                                    {workoutPlan.length === 0 ? (<p className="text-slate-400 text-center py-10">Add exercises from the library.</p>) : (
                                        workoutPlan.map(exercise => (
                                            <div key={exercise.id} draggable="true" onDragStart={() => setDraggedItemId(exercise.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, exercise.id)} onDragEnd={() => setDraggedItemId(null)}
                                            className={`bg-slate-700 p-4 rounded-md animate-fade-in transition-all duration-300 ${draggedItemId === exercise.id ? 'opacity-50' : ''}`}>
                                                <div className="flex items-center justify-between">
                                                    <div><h4 className="font-semibold cursor-grab">{exercise.name}</h4><p className="text-xs text-teal-400">{exercise.muscleGroup}</p></div>
                                                    <button onClick={() => removeExerciseFromPlan(exercise.id)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
                                                </div>
                                                <div className="mt-4 grid grid-cols-3 gap-2">
                                                    <div><label className="text-xs text-slate-400">Weight (kg)</label><input type="number" value={exercise.weight} onChange={(e) => handlePlanUpdate(exercise.id, 'weight', parseInt(e.target.value) || 0)} className="w-full bg-slate-600 p-2 rounded-md mt-1"/></div>
                                                    <div><label className="text-xs text-slate-400">Sets</label><input type="number" value={exercise.sets} onChange={(e) => handlePlanUpdate(exercise.id, 'sets', parseInt(e.target.value) || 0)} className="w-full bg-slate-600 p-2 rounded-md mt-1"/></div>
                                                    <div><label className="text-xs text-slate-400">Reps</label><input type="number" value={exercise.reps} onChange={(e) => handlePlanUpdate(exercise.id, 'reps', parseInt(e.target.value) || 0)} className="w-full bg-slate-600 p-2 rounded-md mt-1"/></div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    </>
                )}
                {activeView === 'dashboard' && (
                    <section id="dashboard">
                         <h1 className="text-4xl text-center font-extrabold tracking-tight text-white mb-12">Workout <span className="text-teal-400">Dashboard</span></h1>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-slate-800 p-6 rounded-lg text-center"><p className="text-slate-400 text-sm">Total Exercises</p><p className="text-4xl font-bold text-teal-400">{dashboardStats.totalExercises}</p></div>
                            <div className="bg-slate-800 p-6 rounded-lg text-center"><p className="text-slate-400 text-sm">Total Volume (kg)</p><p className="text-4xl font-bold text-teal-400">{dashboardStats.totalVolume.toLocaleString()}</p></div>
                            <div className="bg-slate-800 p-6 rounded-lg text-center"><p className="text-slate-400 text-sm">Muscle Groups</p><p className="text-4xl font-bold text-teal-400">{dashboardStats.muscleGroupsTargeted}</p></div>
                            <div className="bg-slate-800 p-6 rounded-lg text-center"><p className="text-slate-400 text-sm">Primary Focus</p><p className="text-4xl font-bold text-teal-400">{dashboardStats.primaryFocus}</p></div>
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-slate-800 p-6 rounded-lg"><h3 className="text-xl font-bold text-center mb-4">Muscle Focus</h3><div className="chart-container"><canvas ref={muscleChartRef}></canvas></div></div>
                            <div className="bg-slate-800 p-6 rounded-lg"><h3 className="text-xl font-bold text-center mb-4">Equipment Used</h3><div className="chart-container"><canvas ref={equipmentChartRef}></canvas></div></div>
                         </div>
                    </section>
                )}
            </main>
            {isTemplatesModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={() => setIsTemplatesModalOpen(false)}>
                    <div className="bg-slate-800 p-8 rounded-lg shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-6">Workout Templates</h2>
                        
                        {/* THIS IS THE CORRECTED LINE */}
                        <button onClick={handleSaveTemplate} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md mb-6">
                            {`Save Current Plan as "${planName}"`}
                        </button>
                        
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {savedTemplates.length === 0 ? <p className="text-slate-400 text-center">No saved templates.</p> :
                                savedTemplates.map(template => (
                                    <div key={template.name} className="bg-slate-700 p-3 rounded-md flex justify-between items-center">
                                        <span className="font-semibold">{template.name}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleLoadTemplate(template)} className="text-sm bg-slate-600 px-3 py-1 rounded-md">Load</button>
                                            <button onClick={() => handleDeleteTemplate(template.name)} className="text-sm text-rose-500">Delete</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}
            <footer className="bg-slate-800 text-white mt-auto border-t border-slate-700">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
                    <p>&copy; {new Date().getFullYear()} Interactive Workout Planner.</p>
                </div>
            </footer>
        </div>
    );
}
