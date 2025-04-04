import { Alert, Snackbar } from '@mui/material';

interface AlertMessageProps {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
  onClose: () => void;
}

export function AlertMessage({ open, message, severity, onClose }: AlertMessageProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}