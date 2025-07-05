import React, { useState, useContext, createContext, useEffect, useCallback} from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // This is essential for calendar styling!


// --- 1. Utility Functions ---
// Prefix for localStorage keys to avoid conflicts
const LS_PREFIX = 'dentalApp_';

// Safely get data from localStorage
const getFromLS = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(LS_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Safely set data to localStorage
const setToLS = (key, value) => {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

// Simple ID generator for new items
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 2. Global App Context ---
// This context will hold all global state: auth, patients, and appointments
const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Hardcoded users for login simulation
  const USERS = [
    { id: 'admin1', email: 'admin@clinic.com', password: 'adminpassword', role: 'admin' },
    { id: 'patient1', email: 'patient1@clinic.com', password: 'patientpassword', role: 'patient', patientId: 'pat_001' },
    { id: 'patient2', email: 'patient2@clinic.com', password: 'patientpassword', role: 'patient', patientId: 'pat_002' },
  ];

  // State for current logged-in user - now initializes from localStorage
  const [currentUser, setCurrentUser] = useState(() => getFromLS('currentUser', null));
  // State for all patients - now initializes from localStorage
  const [patients, setPatients] = useState(() => getFromLS('patients', []));
  // State for all appointments/incidents - now initializes from localStorage
  const [appointments, setAppointments] = useState(() => getFromLS('appointments', []));

  // Persist currentUser to localStorage whenever it changes
  useEffect(() => {
    setToLS('currentUser', currentUser);
  }, [currentUser]);

  // Persist patients to localStorage whenever it changes
  useEffect(() => {
    setToLS('patients', patients);
  }, [patients]);

  // Persist appointments to localStorage whenever it changes
  useEffect(() => {
    setToLS('appointments', appointments);
  }, [appointments]);

  // --- Auth Logic ---
  const login = (email, password) => {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(LS_PREFIX + 'currentUser'); // Clear from localStorage
  };

  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isPatient = currentUser?.role === 'patient';

  // --- Patient CRUD Logic ---
  const addPatient = (patient) => setPatients(prev => [...prev, { ...patient, id: generateId() }]);
  const updatePatient = (updatedPatient) => setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  const deletePatient = (patientId) => {
    setPatients(prev => prev.filter(p => p.id !== patientId));
    setAppointments(prev => prev.filter(a => a.patientId !== patientId)); // Delete related appointments
  };

  // --- Appointment CRUD Logic ---
  const addAppointment = (appointment) => setAppointments(prev => [...prev, { ...appointment, id: generateId() }]);
  const updateAppointment = (updatedAppointment) => setAppointments(prev => prev.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
  const deleteAppointment = (appointmentId) => setAppointments(prev => prev.filter(a => a.id !== appointmentId));

  // The value provided to all components wrapped by AppProvider
  const contextValue = {
    currentUser, isLoggedIn, isAdmin, isPatient, login, logout, USERS,
    patients, appointments,
    addPatient, updatePatient, deletePatient,
    addAppointment, updateAppointment, deleteAppointment,
  };

  return <AppContext.Provider value={contextValue}> {children} </AppContext.Provider>;
};

// --- 3. Reusable UI Components ---

// Generic Input field with label and error display
const Input = ({ label, id, type = 'text', value, onChange, error, className = '', ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-gray-700 text-sm font-bold mb-2">
      {label}
    </label>
    {props.as === 'textarea' ? (
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
    ) : (
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
    )}
    {error && <p className="text-red-500 text-xs italic mt-1">{error}</p>}
  </div>
);

// Generic Button component with styling variants
const Button = ({ children, onClick, className = '', variant = 'primary', ...props }) => {
  const baseStyle = "font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-150 ease-in-out";
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-700 text-white",
    secondary: "bg-gray-300 hover:bg-gray-400 text-gray-800",
    danger: "bg-red-500 hover:bg-red-700 text-white",
    outline: "bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 hover:text-blue-700"
  };
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Generic Modal component for pop-up forms/messages
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null; // Don't render if not open

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto p-6 relative">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">{title}</h2>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-light"
        >
          &times;
        </button>
        <div className="modal-body max-h-[80vh] overflow-y-auto pr-2">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- 4. Page Components ---

// Login screen for users
const LoginPage = ({ navigate }) => {
  const { login } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('dashboard'); // On success, go to dashboard
    } else {
      setError('Invalid email or password.'); // Show error for bad credentials
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:scale-105">
        <h2 className="text-4xl font-extrabold text-center text-blue-800 mb-8">
          Dental Clinic
        </h2>
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@clinic.com or patient1@clinic.com"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="adminpassword or patientpassword"
          />
          {error && <p className="text-red-600 text-sm mb-4 text-center font-medium">{error}</p>}
          <Button type="submit" className="w-full mt-6 py-3 text-lg bg-blue-600 hover:bg-blue-800">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
};

// Navigation bar for authenticated users
const Navbar = ({ navigate }) => {
  const { isLoggedIn, isAdmin, isPatient, logout } = useContext(AppContext);

  return (
    <nav className="bg-blue-700 p-4 text-white shadow-lg">
      <div className="container mx-auto flex justify-between items-center flex-wrap">
        <div className="text-3xl font-extrabold tracking-wide">DentCare</div>
        <div className="flex flex-wrap justify-center gap-3 mt-2 sm:mt-0">
          {isLoggedIn && (
            <>
              {isAdmin && ( // Admin links
                <>
                  <Button variant="outline" onClick={() => navigate('dashboard')}>Dashboard</Button>
                  <Button variant="outline" onClick={() => navigate('patients')}>Patients</Button>
                  <Button variant="outline" onClick={() => navigate('appointments')}>Appointments</Button>
                  <Button variant="outline" onClick={() => navigate('calendar')}>Calendar</Button>
                </>
              )}
              {isPatient && ( // Patient link
                <Button variant="outline" onClick={() => navigate('patient-view')}>My Data</Button>
              )}
              {/* Logout button always visible when logged in */}
              <Button variant="outline" onClick={() => { logout(); navigate('login'); }}>Logout</Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Admin Dashboard page with KPIs
const AdminDashboard = ({ navigate }) => {
  const { patients, appointments } = useContext(AppContext);

  // Calculate KPIs
  const nextAppointments = appointments
    .filter(a => new Date(a.appointmentDatetime) > new Date())
    .sort((a, b) => new Date(a.appointmentDatetime) - new Date(b.appointmentDatetime))
    .slice(0, 5); // Show next 5 for brevity

  const completedTreatments = appointments.filter(a => a.status === 'Completed').length;
  const pendingTreatments = appointments.filter(a => a.status === 'Scheduled').length;

  const totalRevenue = appointments
    .filter(a => a.status === 'Completed' && a.cost)
    .reduce((sum, a) => sum + parseFloat(a.cost || 0), 0);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-green-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Total Revenue</h2>
          <p className="text-5xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
        </div>
        {/* Treatment Status Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-blue-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Treatment Status</h2>
          <p className="text-3xl text-blue-600">Pending: <span className="font-bold">{pendingTreatments}</span></p>
          <p className="text-3xl text-green-600">Completed: <span className="font-bold">{completedTreatments}</span></p>
        </div>
        {/* Patients Count Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-purple-500">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">Total Patients</h2>
          <p className="text-5xl font-bold text-purple-600">{patients.length}</p>
        </div>
      </div>

      {/* Next Appointments Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Next Upcoming Appointments</h2>
        {nextAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {nextAppointments.map(app => {
              const patient = patients.find(p => p.id === app.patientId);
              const appDate = new Date(app.appointmentDatetime);
              return (
                <li key={app.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{app.title}</p>
                    <p className="text-md text-gray-600">
                      <span className="font-medium">{patient ? patient.fullName : 'Unknown Patient'}</span> - {appDate.toLocaleString()}
                    </p>
                  </div>
                  <Button variant="secondary" className="mt-2 sm:mt-0" onClick={() => navigate('appointments', { incidentId: app.id })}>View Details</Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-600 text-lg">No upcoming appointments scheduled.</p>
        )}
      </div>
    </div>
  );
};

// Form for adding/editing patients
const PatientForm = ({ patient, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: '', dob: '', contactInfo: '', healthInfo: '', ...patient,
  });
  const [errors, setErrors] = useState({});

  // Simple validation
  const validate = () => {
    let newErrors = {};
    if (!formData.fullName) newErrors.fullName = "Full Name is required.";
    if (!formData.dob) newErrors.dob = "Date of Birth is required.";
    if (!formData.contactInfo) newErrors.contactInfo = "Contact Info is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <Input label="Full Name" id="fullName" value={formData.fullName} onChange={handleChange} error={errors.fullName} />
      <Input label="Date of Birth" id="dob" type="date" value={formData.dob} onChange={handleChange} error={errors.dob} />
      <Input label="Contact Info (Email/Phone)" id="contactInfo" value={formData.contactInfo} onChange={handleChange} error={errors.contactInfo} />
      <Input label="Health Info" id="healthInfo" value={formData.healthInfo} onChange={handleChange} as="textarea" className="min-h-[80px]" />
      <div className="flex justify-end space-x-4 mt-6">
        <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
        <Button type="submit">Save Patient</Button>
      </div>
    </form>
  );
};

// Page for viewing and managing patients
const PatientsPage = () => {
  const { patients, addPatient, updatePatient, deletePatient } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);

  const openAddModal = () => { setCurrentPatient(null); setIsModalOpen(true); };
  const openEditModal = (patient) => { setCurrentPatient(patient); setIsModalOpen(true); };
  const closeModals = () => { setIsModalOpen(false); setIsConfirmModalOpen(false); setPatientToDelete(null); };

  const handleSavePatient = (patientData) => {
    patientData.id ? updatePatient(patientData) : addPatient(patientData);
  };

  const handleDeleteConfirm = (patient) => {
    setPatientToDelete(patient);
    setIsConfirmModalOpen(true);
  };

  const handleDeletePatient = () => {
    if (patientToDelete) {
      deletePatient(patientToDelete.id);
      closeModals();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Patient Management</h1>

      <div className="flex justify-end mb-6">
        <Button onClick={openAddModal}>Add New Patient</Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Health Info</th> {/* Hidden on small screens */}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-center text-gray-500">No patients added yet.</td>
              </tr>
            ) : (
              patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{p.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{p.dob}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{p.contactInfo}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate hidden md:table-cell">{p.healthInfo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="secondary" className="mr-2" onClick={() => openEditModal(p)}>Edit</Button>
                    <Button variant="danger" onClick={() => handleDeleteConfirm(p)}>Delete</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Patient Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModals} title={currentPatient ? "Edit Patient" : "Add New Patient"}>
        <PatientForm patient={currentPatient} onClose={closeModals} onSave={handleSavePatient} />
      </Modal>

      {/* Patient Delete Confirmation Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={closeModals} title="Confirm Deletion">
        <p className="text-gray-700 mb-6 text-center">
          Are you sure you want to delete patient "<span className="font-semibold">{patientToDelete?.fullName}</span>"?
          This will also delete all their associated appointments.
        </p>
        <div className="flex justify-center space-x-4">
          <Button variant="secondary" onClick={closeModals}>Cancel</Button>
          <Button variant="danger" onClick={handleDeletePatient}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

// Form for adding/editing appointments/incidents
const IncidentForm = ({ incident, onClose, onSave }) => {
  const { patients } = useContext(AppContext); // Access patients to link to appointments
  const [formData, setFormData] = useState({
    title: '', description: '', comments: '', appointmentDatetime: '', status: 'Scheduled',
    cost: '', treatment: '', nextAppointmentDate: '', uploadedFiles: [], patientId: '',
    ...incident,
  });
  const [errors, setErrors] = useState({});
  const [filePreviews, setFilePreviews] = useState(incident?.uploadedFiles || []); // For displaying file previews

  // Validate form fields
  const validate = () => {
    let newErrors = {};
    if (!formData.title) newErrors.title = "Title is required.";
    if (!formData.appointmentDatetime) newErrors.appointmentDatetime = "Date/Time is required.";
    if (!formData.patientId) newErrors.patientId = "Patient is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));

  // Handle file selection and convert to Base64
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, reader.result] // Add new base64 string
        }));
        setFilePreviews(prev => [...prev, reader.result]); // Add to previews
      };
      reader.readAsDataURL(file); // Read file as Base64 data URL
    });
  };

  // Remove uploaded file by index
  const handleRemoveFile = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, index) => index !== indexToRemove)
    }));
    setFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <Input label="Title" id="title" value={formData.title} onChange={handleChange} error={errors.title} />
      <div className="mb-4">
        <label htmlFor="patientId" className="block text-gray-700 text-sm font-bold mb-2">Patient</label>
        <select
          id="patientId" value={formData.patientId} onChange={handleChange}
          className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.patientId ? 'border-red-500' : ''}`}
        >
          <option value="">Select a Patient</option>
          {patients.map(p => (<option key={p.id} value={p.id}>{p.fullName}</option>))}
        </select>
        {errors.patientId && <p className="text-red-500 text-xs italic mt-1">{errors.patientId}</p>}
      </div>
      <Input label="Appointment Date/Time" id="appointmentDatetime" type="datetime-local" value={formData.appointmentDatetime} onChange={handleChange} error={errors.appointmentDatetime} />
      <Input label="Description" id="description" value={formData.description} onChange={handleChange} as="textarea" className="min-h-[80px]" />
      <Input label="Comments" id="comments" value={formData.comments} onChange={handleChange} as="textarea" className="min-h-[80px]" />

      {/* Status dropdown */}
      <div className="mb-4">
        <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">Status</label>
        <select id="status" value={formData.status} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Conditional fields for completed appointments */}
      {formData.status === 'Completed' && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Post-Appointment Details</h3>
          <Input label="Cost (₹)" id="cost" type="number" value={formData.cost} onChange={handleChange} />
          <Input label="Treatment" id="treatment" value={formData.treatment} onChange={handleChange} />
          <Input label="Next Appointment Date" id="nextAppointmentDate" type="date" value={formData.nextAppointmentDate} onChange={handleChange} />
          
          {/* File Upload Section */}
          <div className="mb-4">
            <label htmlFor="fileUpload" className="block text-gray-700 text-sm font-bold mb-2">Upload Files (Invoices, Images)</label>
            <input
              type="file" id="fileUpload" multiple onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filePreviews.map((fileData, index) => (
                <div key={index} className="relative border rounded p-1">
                  {fileData.startsWith('data:image') ? (
                    <img src={fileData} alt={`Uploaded ${index}`} className="w-full h-20 object-cover rounded" />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center bg-gray-100 text-xs text-gray-600 rounded break-all p-1">File {index + 1}</div>
                  )}
                  <button
                    type="button" onClick={() => handleRemoveFile(index)}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    title="Remove file"
                  >&times;</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4 mt-6">
        <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
        <Button type="submit">Save Appointment</Button>
      </div>
    </form>
  );
};

// Page for viewing and managing appointments
const AppointmentsPage = () => {
  const { patients, appointments, addAppointment, updateAppointment, deleteAppointment } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState(null);

  const openAddModal = () => { setCurrentIncident(null); setIsModalOpen(true); };
  const openEditModal = (incident) => { setCurrentIncident(incident); setIsModalOpen(true); };
  const closeModals = () => { setIsModalOpen(false); setIsConfirmModalOpen(false); setIncidentToDelete(null); };

  const handleSaveIncident = (incidentData) => {
    incidentData.id ? updateAppointment(incidentData) : addAppointment(incidentData);
  };

  const handleDeleteConfirm = (incident) => {
    setIncidentToDelete(incident);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteIncident = () => {
    if (incidentToDelete) {
      deleteAppointment(incidentToDelete.id);
      closeModals();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Appointment & Incident Management</h1>

      <div className="flex justify-end mb-6">
        <Button onClick={openAddModal}>Add New Appointment</Button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-center text-gray-500">No appointments yet.</td>
              </tr>
            ) : (
              appointments.map(incident => {
                const patient = patients.find(p => p.id === incident.patientId);
                const appDate = new Date(incident.appointmentDatetime);
                return (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{incident.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{patient ? patient.fullName : 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{appDate.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{incident.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="secondary" className="mr-2" onClick={() => openEditModal(incident)}>Edit</Button>
                      <Button variant="danger" onClick={() => handleDeleteConfirm(incident)}>Delete</Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Appointment Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModals} title={currentIncident ? "Edit Appointment" : "Add New Appointment"}>
        <IncidentForm incident={currentIncident} onClose={closeModals} onSave={handleSaveIncident} />
      </Modal>

      {/* Appointment Delete Confirmation Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={closeModals} title="Confirm Deletion">
        <p className="text-gray-700 mb-6 text-center">
          Are you sure you want to delete this appointment/incident: "<span className="font-semibold">{incidentToDelete?.title}</span>"?
        </p>
        <div className="flex justify-center space-x-4">
          <Button variant="secondary" onClick={closeModals}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteIncident}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

// Calendar view for appointments
const CalendarView = () => {
  const { patients, appointments } = useContext(AppContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Helper to get all days in the current month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0);
    return Array.from({ length: lastDayOfMonth.getDate() }, (_, i) => new Date(year, month, i + 1));
  };

  // Helper to get the offset for the first day of the month (to align with weekday grid)
  const getStartDayOffset = (date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return (firstDayOfMonth.getDay() + 6) % 7; // Adjust to make Monday 0, Sunday 6
  };

  const daysInCurrentMonth = getDaysInMonth(currentDate);
  const startOffset = getStartDayOffset(currentDate);
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Navigate to previous/next month
  const handleMonthChange = (offset) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // Handle clicking on a calendar day to show appointments
  const handleDayClick = (day) => {
    const dayAppointments = appointments.filter(app => {
      const appDate = new Date(app.appointmentDatetime);
      return appDate.toDateString() === day.toDateString();
    }).map(app => {
      const patient = patients.find(p => p.id === app.patientId);
      return { ...app, patientName: patient ? patient.fullName : 'Unknown' };
    });
    setSelectedDayAppointments(dayAppointments);
    setIsDayModalOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Calendar View</h1>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <Button variant="secondary" onClick={() => handleMonthChange(-1)}>&lt; Prev</Button>
          <h2 className="text-2xl font-semibold text-gray-800">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="secondary" onClick={() => handleMonthChange(1)}>Next &gt;</Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 text-center font-bold text-gray-600 mb-2 border-b pb-2">
          {daysOfWeek.map(day => <div key={day}>{day}</div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the 1st of the month */}
          {[...Array(startOffset)].map((_, i) => (
            <div key={`empty-${i}`} className="h-28 bg-gray-50 rounded-lg"></div>
          ))}
          {/* Days of the month */}
          {daysInCurrentMonth.map(day => {
            const dayAppointmentsCount = appointments.filter(app =>
              new Date(app.appointmentDatetime).toDateString() === day.toDateString()
            ).length;
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={day.toISOString()}
                className={`h-28 border rounded-lg p-2 flex flex-col items-center justify-between cursor-pointer transition duration-150 ease-in-out
                            ${isToday ? 'bg-blue-100 border-blue-500 shadow-md' : 'bg-white hover:bg-gray-50'}
                            ${dayAppointmentsCount > 0 ? 'bg-green-50 border-green-300 hover:bg-green-100' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <span className={`font-semibold text-lg ${isToday ? 'text-blue-800' : 'text-gray-800'}`}>{day.getDate()}</span>
                {dayAppointmentsCount > 0 && (
                  <span className="text-xs text-green-700 font-medium bg-green-200 px-2 py-1 rounded-full">
                    {dayAppointmentsCount} Appt{dayAppointmentsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal to display appointments for a selected day */}
      <Modal isOpen={isDayModalOpen} onClose={() => setIsDayModalOpen(false)} title="Appointments for Selected Day">
        {selectedDayAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {selectedDayAppointments.map(app => (
              <li key={app.id} className="py-3">
                <p className="font-semibold text-gray-800 text-lg">{app.title}</p>
                <p className="text-sm text-gray-600">Patient: {app.patientName}</p>
                <p className="text-sm text-gray-600">Time: {new Date(app.appointmentDatetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-sm text-gray-600">Status: {app.status}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-center py-4">No appointments scheduled for this day.</p>
        )}
      </Modal>
    </div>
  );
};

// Patient's own view of their data
const PatientViewPage = () => {
  const { currentUser, patients, appointments } = useContext(AppContext);

  // Find the patient data linked to the logged-in user
  const currentPatientData = patients.find(p => p.id === currentUser?.patientId);

  // Filter appointments relevant to this patient
  const patientAppointments = appointments.filter(app => app.patientId === currentUser?.patientId);

  // Separate upcoming and past appointments
  const upcomingAppointments = patientAppointments
    .filter(app => new Date(app.appointmentDatetime) > new Date())
    .sort((a, b) => new Date(a.appointmentDatetime) - new Date(b.appointmentDatetime));

  const appointmentHistory = patientAppointments
    .filter(app => new Date(app.appointmentDatetime) <= new Date())
    .sort((a, b) => new Date(b.appointmentDatetime) - new Date(a.appointmentDatetime)); // Most recent first

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [currentFilePreview, setCurrentFilePreview] = useState(null);

  // Open modal to preview uploaded file (Base64 image)
  const openFilePreview = (fileBase64) => {
    setCurrentFilePreview(fileBase64);
    setIsFileModalOpen(true);
  };

  // Handle case where patient data isn't found
  if (!currentPatientData) {
    return (
      <div className="container mx-auto p-6 text-center text-gray-600">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">My Data</h1>
        <p>Your patient data could not be found. Please contact clinic administration.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-8">Welcome, {currentPatientData.fullName}!</h1>

      {/* Patient's Personal Information */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">My Information</h2>
        <p className="mb-2 text-lg"><span className="font-medium text-gray-800">Date of Birth:</span> {currentPatientData.dob}</p>
        <p className="mb-2 text-lg"><span className="font-medium text-gray-800">Contact:</span> {currentPatientData.contactInfo}</p>
        <p className="mb-2 text-lg"><span className="font-medium text-gray-800">Health Info:</span> {currentPatientData.healthInfo}</p>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">My Upcoming Appointments</h2>
        {upcomingAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {upcomingAppointments.map(app => (
              <li key={app.id} className="py-3">
                <p className="font-semibold text-gray-800 text-lg">{app.title}</p>
                <p className="text-md text-gray-600">Date/Time: {new Date(app.appointmentDatetime).toLocaleString()}</p>
                <p className="text-md text-gray-600">Status: {app.status}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-lg">No upcoming appointments scheduled.</p>
        )}
      </div>

      {/* Appointment History */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">My Appointment History</h2>
        {appointmentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachments</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointmentHistory.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{new Date(app.appointmentDatetime).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{app.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{app.treatment || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">₹{parseFloat(app.cost || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {app.uploadedFiles && app.uploadedFiles.length > 0 ? (
                        app.uploadedFiles.map((file, index) => (
                          <button key={index} onClick={() => openFilePreview(file)} className="underline text-blue-600 hover:text-blue-800 mr-2">
                            File {index + 1}
                          </button>
                        ))
                      ) : (
                        'None'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-lg">No past appointments in your history.</p>
        )}
      </div>

      {/* File Preview Modal */}
      <Modal isOpen={isFileModalOpen} onClose={() => setIsFileModalOpen(false)} title="File Preview">
        {currentFilePreview && currentFilePreview.startsWith('data:image') ? (
          <img src={currentFilePreview} alt="File Preview" className="max-w-full h-auto rounded-lg" />
        ) : (
          <p className="text-gray-700 text-center">Cannot display preview for this file type. This is a base64 string representation of the file.</p>
        )}
      </Modal>
    </div>
  );
};


// --- 5. Main Application Component ---
// This is the main component that orchestrates the entire application.
// It handles routing based on authentication status and user roles.
function App() { // Removed 'export default' here
  const { isLoggedIn, isAdmin, isPatient } = useContext(AppContext);
  const [currentPage, setCurrentPage] = useState('login'); // Controls which page is displayed

  // Callback for navigation between pages
  const navigate = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Effect to manage initial page redirection based on login status and role
  useEffect(() => {
    if (isLoggedIn) {
      if (isAdmin) {
        navigate('dashboard');
      } else if (isPatient) {
        navigate('patient-view');
      }
    } else {
      navigate('login'); // If not logged in, always go to login page
    }
  }, [isLoggedIn, isAdmin, isPatient, navigate]); // Re-run when these values change

  // Renders the appropriate page component based on the current state and user role
  const renderPage = () => {
    if (!isLoggedIn) {
      return <LoginPage navigate={navigate} />;
    }

    if (isAdmin) {
      switch (currentPage) {
        case 'dashboard': return <AdminDashboard navigate={navigate} />;
        case 'patients': return <PatientsPage />;
        case 'appointments': return <AppointmentsPage />;
        case 'calendar': return <CalendarView />;
        default: return <AdminDashboard navigate={navigate} />; // Default for admin
      }
    }

    if (isPatient) {
      switch (currentPage) {
        case 'patient-view': return <PatientViewPage />;
        default: return <PatientViewPage />; // Default for patient
      }
    }

    return <LoginPage navigate={navigate} />; // Fallback, should ideally not be reached if isLoggedIn is handled
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans antialiased flex flex-col">
      {isLoggedIn && <Navbar navigate={navigate} />} {/* Navbar only visible when logged in */}
      <main className="flex-grow">
        {renderPage()} {/* Render the current page */}
      </main>
    </div>
  );
}

// --- Root Component for Canvas ---
// This component wraps the main App with its necessary providers (Auth and Data).
// This is the single default export required for the Canvas environment.
// The previous error was due to having two `export default` statements.
// Now, `App` is a regular function, and `Root` is the only default export.
// This structure is common when you have multiple contexts or setup logic.
export default function Root() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
