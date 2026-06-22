import { WorkspaceData } from './types';

// Encodes a standard string into a base64url-compliant string
export function base64urlEncode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error('Encoding error:', error);
    return '';
  }
}

// Fetch general Google User Profile info
export async function getGoogleUserProfile(accessToken: string): Promise<{ email: string; name: string; picture?: string } | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return await res.json();
  } catch (error) {
    console.error('getGoogleUserProfile error:', error);
    return null;
  }
}

// Query Google Drive to find our saved workspace file
export async function findWorkspaceFile(accessToken: string): Promise<string | null> {
  try {
    const query = encodeURIComponent("name = 'workspace_os_data.json' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('Failed to query Google Drive');
    }
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('findWorkspaceFile error:', error);
    return null;
  }
}

// Download file contents from Google Drive
export async function downloadWorkspaceFile(accessToken: string, fileId: string): Promise<WorkspaceData | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('Failed to download from Drive');
    }
    return await res.json();
  } catch (error) {
    console.error('downloadWorkspaceFile error:', error);
    return null;
  }
}

// Create a new data file in Google Drive and return its fileId
export async function createWorkspaceFileInDrive(accessToken: string, initialData: WorkspaceData): Promise<string | null> {
  try {
    // 1. Create file metadata in Drive
    const metadataRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'workspace_os_data.json',
        mimeType: 'application/json',
      }),
    });

    if (!metadataRes.ok) {
      throw new Error('Failed to create metadata in Google Drive');
    }

    const fileMeta = await metadataRes.json();
    const fileId = fileMeta.id;

    // 2. Upload file content
    const contentRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialData, null, 2),
    });

    if (!contentRes.ok) {
      throw new Error('Failed to upload workspace content to Google Drive');
    }

    return fileId;
  } catch (error) {
    console.error('createWorkspaceFileInDrive error:', error);
    return null;
  }
}

// Update existing file in Google Drive
export async function updateWorkspaceFileInDrive(accessToken: string, fileId: string, updatedData: WorkspaceData): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData, null, 2),
    });

    if (!res.ok) {
      throw new Error('Failed to update file content on Google Drive');
    }
    return true;
  } catch (error) {
    console.error('updateWorkspaceFileInDrive error:', error);
    return false;
  }
}

// Send real-time Email using Gmail Send API
export async function sendGmailEmail(accessToken: string, toAddress: string, subjectLine: string, messageBody: string): Promise<boolean> {
  try {
    const emailHeaderAndBody = [
      `To: ${toAddress}`,
      `Subject: ${subjectLine}`,
      `Content-Type: text/plain; charset=utf-8`,
      `MIME-Version: 1.0`,
      '',
      messageBody
    ].join('\r\n');

    const rawEmailBase64 = base64urlEncode(emailHeaderAndBody);
    if (!rawEmailBase64) {
      throw new Error('Error encoding email headers and content');
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawEmailBase64
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Gmail send response error:', errorData);
      throw new Error('Failed to send email via Gmail API');
    }

    return true;
  } catch (error) {
    console.error('sendGmailEmail error:', error);
    return false;
  }
}

// Fetch Google Contacts from People API
export async function getGoogleContacts(accessToken: string): Promise<{ name: string; email: string }[]> {
  try {
    const res = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=100', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch Google Contacts');
    }
    const data = await res.json();
    const contactsList: { name: string; email: string }[] = [];
    
    if (data.connections && data.connections.length > 0) {
      for (const person of data.connections) {
        const name = person.names?.[0]?.displayName || 'Unnamed Contact';
        const email = person.emailAddresses?.[0]?.value;
        if (email) {
          contactsList.push({ name, email });
        }
      }
    }
    return contactsList;
  } catch (error) {
    console.error('getGoogleContacts error:', error);
    return [];
  }
}

