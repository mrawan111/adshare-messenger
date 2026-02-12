import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { t } from "@/i18n";
import * as XLSX from 'xlsx';

interface Contact {
  name: string;
  phone_number: string;
}

interface ExcelContactImporterProps {
  onContactsImported: (contacts: Contact[]) => void;
}

export function ExcelContactImporter({ onContactsImported }: ExcelContactImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [allProcessedContacts, setAllProcessedContacts] = useState<Contact[]>([]);
  const [previewData, setPreviewData] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadSampleTemplate = () => {
    const sampleData = [
      { name: 'John Doe', phone_number: '+201234567890' },
      { name: 'Jane Smith', phone_number: '+201234567891' },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "sample_contacts.xlsx");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast.error(t("whatsapp.validFileError"));
        return;
      }

      setFile(selectedFile);
      setErrors([]);
      setShowPreview(false);
      setPreviewData([]);
    }
  };

  const processExcelFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setImportProgress(0);
    setErrors([]);

    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          setImportProgress(50);
          
          const processedContacts: Contact[] = [];
          const newErrors: string[] = [];
          const seenPhoneNumbers = new Set<string>();
          
          jsonData.forEach((row: Record<string, unknown>, index: number) => {
            const rowNum = index + 2;
            
            const name = (row.name || row.Name || row.NAME || row.contact_name || row.Contact || row['Full Name']) as string;
            const phone = (row.phone_number || row.Phone || row.PHONE || row.phone || row.PhoneNumber || row['Phone Number'] || row.number || row.Number) as string;
            
            if (!name && !phone) {
              newErrors.push(`Row ${rowNum}: Empty row skipped`);
              return;
            }
            
            if (!phone) {
              newErrors.push(`Row ${rowNum}: Missing phone number`);
              return;
            }
            
            const cleanPhone = phone.toString().trim().replace(/[^\d+]/g, '');
            
            if (cleanPhone.length < 10) {
              newErrors.push(`Row ${rowNum}: Invalid phone number`);
              return;
            }
            
            let formattedPhone = cleanPhone;
            if (!cleanPhone.startsWith('+')) {
              if (cleanPhone.startsWith('0')) {
                formattedPhone = '+20' + cleanPhone.substring(1);
              } else {
                formattedPhone = '+20' + cleanPhone;
              }
            }

            if (seenPhoneNumbers.has(formattedPhone)) {
              newErrors.push(`Row ${rowNum}: Duplicate phone number skipped`);
              return;
            }
            seenPhoneNumbers.add(formattedPhone);
            
            processedContacts.push({
              name: name || `Contact ${formattedPhone}`,
              phone_number: formattedPhone
            });
          });
          
          setImportProgress(100);
          setErrors(newErrors);
          setAllProcessedContacts(processedContacts);
          setPreviewData(processedContacts.slice(0, 10)); // Show first 10 for preview
          setShowPreview(true);
          
          if (processedContacts.length === 0) {
            toast.error(t("whatsapp.noValidContacts"));
          } else {
            toast.success(t("whatsapp.foundValidContacts", { count: processedContacts.length }));
          }
        } catch (error) {
          toast.error(t("whatsapp.processingError"));
          console.error(error);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error(t("whatsapp.readingError"));
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = () => {
    if (allProcessedContacts.length === 0) return;
    
    console.log('Importing contacts:', allProcessedContacts);
    onContactsImported(allProcessedContacts);
    
    // Reset form
    setFile(null);
    setAllProcessedContacts([]);
    setPreviewData([]);
    setShowPreview(false);
    setErrors([]);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFile(null);
    setAllProcessedContacts([]);
    setPreviewData([]);
    setShowPreview(false);
    setErrors([]);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          {t("whatsapp.importFromExcel")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Download Template */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
          <div>
            <p className="font-medium text-blue-800">{t("whatsapp.needTemplate")}</p>
            <p className="text-sm text-blue-600">{t("whatsapp.downloadSample")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadSampleTemplate}>
            <Download className="mr-2 h-4 w-4" />
            {t("whatsapp.downloadTemplate")}
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="excel-file">{t("whatsapp.selectExcelFile")}</Label>
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            ref={fileInputRef}
          />
        </div>

        {/* File Info */}
        {file && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{file.name}</span>
              <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t("whatsapp.processingFile")}</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} />
          </div>
        )}

        {/* Action Buttons */}
        {!showPreview && (
          <Button 
            onClick={processExcelFile} 
            disabled={!file || isProcessing}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isProcessing ? t("whatsapp.processingFile") : t("whatsapp.processFile")}
          </Button>
        )}

        {/* Preview Section */}
        {showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t("whatsapp.previewContacts")}</h3>
              <Badge variant="outline">{allProcessedContacts.length} contacts</Badge>
            </div>
            
            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 bg-gray-50 p-2 text-sm font-medium">
                <div>{t("whatsapp.name")}</div>
                <div>{t("whatsapp.phoneNumber")}</div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {previewData.map((contact, index) => (
                  <div key={index} className="grid grid-cols-2 p-2 border-b text-sm">
                    <div>{contact.name}</div>
                    <div>{contact.phone_number}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">{t("whatsapp.importWarnings")}</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-amber-700">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={confirmImport} className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("whatsapp.importContacts", { count: allProcessedContacts.length })}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                {t("whatsapp.cancel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
