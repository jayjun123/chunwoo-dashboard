import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Permissions = () => {
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {
      sites: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      safety: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      schedule: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      cost: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      documents: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      discussions: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      vendors: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      members: {
        view: false,
        create: false,
        edit: false,
        delete: false
      },
      permissions: {
        view: false,
        create: false,
        edit: false,
        delete: false
      }
    }
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'roles'));
      const roleList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoles(roleList);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleOpen = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData(role);
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: {
          sites: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          safety: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          schedule: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          cost: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          documents: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          discussions: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          vendors: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          members: {
            view: false,
            create: false,
            edit: false,
            delete: false
          },
          permissions: {
            view: false,
            create: false,
            edit: false,
            delete: false
          }
        }
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateDoc(doc(db, 'roles', editingRole.id), formData);
      } else {
        await addDoc(collection(db, 'roles'), formData);
      }
      handleClose();
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDelete = async (roleId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'roles', roleId));
        fetchRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const handlePermissionChange = (module, action, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: value
        }
      }
    }));
  };

  const PermissionSwitch = ({ module, action, checked }) => (
    <FormControlLabel
      control={
        <Switch
          checked={checked}
          onChange={(e) => handlePermissionChange(module, action, e.target.checked)}
          size="small"
        />
      }
      label={action}
    />
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">권한 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          역할 추가
        </Button>
      </Box>

      <Grid container spacing={3}>
        {roles.map((role) => (
          <Grid item xs={12} md={6} key={role.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{role.name}</Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(role)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(role.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {role.description}
                </Typography>
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>모듈</TableCell>
                        <TableCell>권한</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(role.permissions).map(([module, permissions]) => (
                        <TableRow key={module}>
                          <TableCell>{module}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              {Object.entries(permissions).map(([action, value]) => (
                                <PermissionSwitch
                                  key={action}
                                  module={module}
                                  action={action}
                                  checked={value}
                                />
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRole ? '역할 수정' : '새 역할 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="역할명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              권한 설정
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>모듈</TableCell>
                    <TableCell>권한</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(formData.permissions).map(([module, permissions]) => (
                    <TableRow key={module}>
                      <TableCell>{module}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {Object.entries(permissions).map(([action, value]) => (
                            <PermissionSwitch
                              key={action}
                              module={module}
                              action={action}
                              checked={value}
                            />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRole ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Permissions; 