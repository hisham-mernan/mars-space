import {
  contractRepository,
  contractTemplateRepository,
  contractVersionRepository,
  workspaceRepository,
  userRepository
} from '@/repositories';
import { eventBus, DOMAIN_EVENTS } from '@/core/events/EventBus';
import { auditLogService } from './AuditLogService';
import { workspaceService } from './WorkspaceService';
import { invoiceService } from './InvoiceService';

export class ContractService {
  constructor() {
    this._registerEventHandlers();
  }

  _registerEventHandlers() {
    // Event-driven Downstream Automation upon CONTRACT_ACTIVATED
    eventBus.subscribe(DOMAIN_EVENTS.CONTRACT_ACTIVATED, async (event) => {
      const { contract } = event.payload;

      // 1. Workspace Allocation (Mark workspace occupied if workspaceId provided)
      if (contract.workspaceId) {
        try {
          await workspaceService.updateWorkspace(contract.workspaceId, {
            status: 'Occupied',
            currentTenant: contract.companyName || contract.customerName
          }, 'System CLM Automation');
        } catch (err) {
          console.error('CLM Automation: Failed updating workspace status:', err);
        }
      }

      // 2. Generate First Membership Invoice
      try {
        await invoiceService.createInvoice({
          customerId: contract.customerId,
          customerName: contract.customerName,
          companyName: contract.companyName,
          type: 'Contract Invoice',
          description: `Contract ${contract.contractNumber} - ${contract.planName || 'Workspace Agreement'}`,
          amount: contract.total || contract.monthlyFee,
          dueDate: contract.startDate || new Date().toISOString().split('T')[0],
          status: 'Unpaid'
        });
      } catch (err) {
        console.error('CLM Automation: Failed generating contract invoice:', err);
      }
    });
  }

  /**
   * Placeholder Interpolation Engine
   */
  interpolate(templateText, data) {
    if (!templateText) return '';
    let text = templateText;
    const placeholders = {
      '{{CustomerName}}': data.customerName || 'Valued Customer',
      '{{Company}}': data.companyName || 'Individual Member',
      '{{OfficeNumber}}': data.officeNumber || 'Suite A-101',
      '{{Workspace}}': data.workspaceName || 'Private Office',
      '{{ContractStart}}': data.startDate || new Date().toISOString().split('T')[0],
      '{{ContractEnd}}': data.endDate || '2026-12-31',
      '{{MonthlyPrice}}': data.monthlyFee || 4800,
      '{{VAT}}': Math.round((data.monthlyFee || 4800) * 0.15),
      '{{Total}}': Math.round((data.monthlyFee || 4800) * 1.15),
      '{{MemberBenefits}}': data.benefits || 'High-Speed Wi-Fi, 24/7 Access, Coffee Lounge',
      '{{Parking}}': data.parkingSpaces ? `${data.parkingSpaces} Reserved Slots` : 'Standard Parking',
      '{{Locker}}': data.lockerUnit || 'Locker #14',
      '{{MeetingCredits}}': data.meetingCredits ? `${data.meetingCredits} Hours / Month` : '15 Hours / Month',
      '{{AuthorizedSignatory}}': data.signatory || data.customerName || 'Authorized Executive'
    };

    Object.keys(placeholders).forEach(key => {
      const re = new RegExp(key, 'g');
      text = text.replace(re, placeholders[key]);
    });

    return text;
  }

  async getContracts(filters = {}) {
    let list = await contractRepository.findAll();

    if (list.length === 0) {
      // Seed default contracts list
      list = [
        {
          id: 'con-5001',
          contractNumber: 'MS-CON-2026-5001',
          customerId: 'usr-01',
          customerName: 'Ahmed Alharbi',
          companyName: 'Mars Technologies',
          planName: 'Private Office Business Suite',
          workspaceId: 'office-a101',
          workspaceName: 'Private Office A-101',
          status: 'Active',
          version: 1,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          monthlyFee: 4800,
          vat: 720,
          total: 5520,
          signingToken: 'st-seed-5001',
          signedAt: '2026-01-01T10:00:00Z',
          counterSignedAt: '2026-01-01T11:00:00Z',
          signatoryName: 'Ahmed Alharbi',
          signatoryIp: '185.192.44.10',
          signatoryUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          signatureMethod: 'Draw',
          signatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        }
      ];
    }

    if (filters.status) {
      list = list.filter(c => c.status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.customerId) {
      list = list.filter(c => c.customerId === filters.customerId);
    }
    return list;
  }

  async getContractById(id) {
    const contracts = await this.getContracts();
    return contracts.find(c => c.id === id) || null;
  }

  async getContractByToken(token) {
    const contracts = await this.getContracts();
    const contract = contracts.find(c => c.signingToken === token);
    if (contract && contract.status === 'Sent to Customer') {
      await contractRepository.update(contract.id, { status: 'Viewed' });
      await eventBus.publish(DOMAIN_EVENTS.CONTRACT_VIEWED, { contract });
      contract.status = 'Viewed';
    }
    return contract || null;
  }

  async getTemplates() {
    let templates = await contractTemplateRepository.findAll();
    if (templates.length === 0) {
      templates = [
        {
          id: 'tpl-office',
          name: 'Private Office Suite Agreement',
          category: 'Private Office',
          body: `THIS WORKSPACE AGREEMENT is made between Mars Space Coworking & Offices ("Provider") and {{Company}} represented by {{AuthorizedSignatory}} ("Member").\n\n1. WORKSPACE ALLOCATION\nProvider grants Member exclusive occupancy of {{Workspace}} ({{OfficeNumber}}) located at Jeddah Towers Branch.\n\n2. DURATION & FEES\nContract Start Date: {{ContractStart}}\nContract Expiry Date: {{ContractEnd}}\nMonthly Occupancy Fee: SAR {{MonthlyPrice}} + VAT (SAR {{VAT}}) = Total SAR {{Total}} / Month.\n\n3. INCLUDED SERVICES & AMENITIES\n- 24/7 Keyless Door Access\n- {{MeetingCredits}} Meeting Room Allowance\n- {{Parking}}\n- {{Locker}}\n- {{MemberBenefits}}\n\n4. SIGNATURE AUTHORIZATION\nBy digitally signing below, Member agrees to all Space Terms & Regulations.`,
          bodyAr: `تم إبرام اتفاقية مساحة العمل هذه بين شركة مساحات مارس ("المزود") وشركة {{Company}} الممثلة بالمفوض {{AuthorizedSignatory}} ("العضو").\n\n١. تخصيص المساحة\nيمنح المزود العضو حق الاستخدام المباشر للمكتب {{Workspace}} ({{OfficeNumber}}) في فرع أبراج جدة.\n\n٢. المدة والرسوم المقررة\nتاريخ بداية العقد: {{ContractStart}}\nتاريخ نهاية العقد: {{ContractEnd}}\nالرسوم الشهرية: {{MonthlyPrice}} ريال + ضريبة القيمة المضافة = الإجمالي {{Total}} ريال / شهرياً.`
        },
        {
          id: 'tpl-coworking',
          name: 'Coworking Flex Membership Agreement',
          category: 'Coworking',
          body: `COWORKING FLEX MEMBERSHIP AGREEMENT\n\nMember Name: {{CustomerName}}\nCompany: {{Company}}\nStart Date: {{ContractStart}}\nMonthly Fee: SAR {{MonthlyPrice}} / Month\nIncluded: Unlimited Flex Desks Access, 10 Meeting Room Credits, High Speed Internet.`,
          bodyAr: `اتفاقية عضوية المكتب المرن\n\nاسم العضو: {{CustomerName}}\nالشركة: {{Company}}\nالرسوم الشهرية: {{MonthlyPrice}} ريال / شهرياً.`
        }
      ];
    }
    return templates;
  }

  /**
   * Contract Builder: Builds and generates a new contract from templates & parameters
   */
  async createContract(builderData, actor = 'Sales Executive') {
    const templates = await this.getTemplates();
    const tpl = templates.find(t => t.id === builderData.templateId) || templates[0];

    const count = (await contractRepository.findAll()).length + 5002;
    const contractNumber = `MS-CON-2026-${count}`;
    const token = `st-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const interpolatedBody = this.interpolate(tpl.body, builderData);
    const interpolatedBodyAr = this.interpolate(tpl.bodyAr, builderData);

    const newContract = await contractRepository.create({
      contractNumber,
      templateId: tpl.id,
      templateName: tpl.name,
      customerId: builderData.customerId || 'usr-01',
      customerName: builderData.customerName || 'Ahmed Alharbi',
      companyName: builderData.companyName || 'Mars Technologies',
      workspaceId: builderData.workspaceId || 'office-a101',
      workspaceName: builderData.workspaceName || 'Private Office A-101',
      officeNumber: builderData.officeNumber || 'Suite A-101',
      planName: builderData.planName || tpl.category,
      startDate: builderData.startDate || new Date().toISOString().split('T')[0],
      endDate: builderData.endDate || '2026-12-31',
      monthlyFee: Number(builderData.monthlyFee || 4800),
      vat: Math.round(Number(builderData.monthlyFee || 4800) * 0.15),
      total: Math.round(Number(builderData.monthlyFee || 4800) * 1.15),
      parkingSpaces: builderData.parkingSpaces || 1,
      lockerUnit: builderData.lockerUnit || 'Locker #14',
      meetingCredits: builderData.meetingCredits || 20,
      content: interpolatedBody,
      contentAr: interpolatedBodyAr,
      status: 'Draft',
      version: 1,
      signingToken: token
    });

    // Create initial Version 1
    await contractVersionRepository.create({
      contractId: newContract.id,
      version: 1,
      content: interpolatedBody,
      createdBy: actor,
      reason: 'Initial Contract Draft Generation'
    });

    await auditLogService.recordAudit({
      actor,
      action: 'CREATE_CONTRACT_DRAFT',
      module: 'CLM',
      entityId: newContract.id,
      afterState: newContract
    });

    return newContract;
  }

  /**
   * Send Contract to Customer -> Generates Token Signing Link
   */
  async sendToCustomer(id, actor = 'Sales Executive') {
    const contract = await contractRepository.findById(id);
    if (!contract) throw new Error('Contract not found');

    const updated = await contractRepository.update(id, {
      status: 'Sent to Customer',
      sentAt: new Date().toISOString()
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_SENT, { contract: updated });
    return updated;
  }

  /**
   * Public e-Signature Execution
   */
  async customerSign(token, signaturePayload, metadata = {}) {
    const contract = await contractRepository.findByToken(token);
    if (!contract) throw new Error('Invalid or expired contract signing token');

    const { signatureMethod, signatureData, signatoryName } = signaturePayload;
    const timestamp = new Date().toISOString();
    const signatureHash = `hash-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    const updated = await contractRepository.update(contract.id, {
      status: 'Signed',
      signatoryName: signatoryName || contract.customerName,
      signedAt: timestamp,
      signatureMethod: signatureMethod || 'Draw',
      signatureData: signatureData || 'DATA_URL_SIGNATURE',
      signatoryIp: metadata.ip || '185.192.44.10',
      signatoryUserAgent: metadata.userAgent || 'Mozilla/5.0 Web browser',
      signatureHash
    });

    await auditLogService.recordAudit({
      actor: signatoryName || contract.customerName,
      action: 'CUSTOMER_E_SIGNATURE',
      module: 'CLM',
      entityId: contract.id,
      afterState: updated
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_SIGNED, { contract: updated });
    return updated;
  }

  /**
   * Counter-Sign by Company Executive -> Activates Contract & Downstream Automation
   */
  async counterSign(id, managerName = 'CEO / Operations Manager', actor = 'Executive Manager') {
    const contract = await contractRepository.findById(id);
    if (!contract) throw new Error('Contract not found');

    const timestamp = new Date().toISOString();
    const updated = await contractRepository.update(id, {
      status: 'Active',
      counterSignedBy: managerName,
      counterSignedAt: timestamp
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_COUNTERSIGNED, { contract: updated });
    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_ACTIVATED, { contract: updated });

    await auditLogService.recordAudit({
      actor,
      action: 'COUNTER_SIGN_ACTIVATED',
      module: 'CLM',
      entityId: id,
      afterState: updated
    });

    return updated;
  }

  /**
   * Contract Amendment
   */
  async amendContract(id, amendmentData, actor = 'Sales Executive') {
    const contract = await contractRepository.findById(id);
    if (!contract) throw new Error('Contract not found');

    const nextVersion = (contract.version || 1) + 1;
    const updatedContent = `${contract.content}\n\n[AMENDMENT v${nextVersion}]: ${amendmentData.reason || 'Added Services'}`;

    const updated = await contractRepository.update(id, {
      version: nextVersion,
      monthlyFee: amendmentData.newMonthlyFee || contract.monthlyFee,
      total: Math.round((amendmentData.newMonthlyFee || contract.monthlyFee) * 1.15),
      status: 'Draft', // Resets to Draft for new review & signing
      content: updatedContent
    });

    await contractVersionRepository.create({
      contractId: id,
      version: nextVersion,
      content: updatedContent,
      createdBy: actor,
      reason: amendmentData.reason || 'Contract Amendment'
    });

    await eventBus.publish(DOMAIN_EVENTS.CONTRACT_AMENDED, { contract: updated, version: nextVersion });
    return updated;
  }

  /**
   * Contract Audit Verification Certificate payload
   */
  async getAuditCertificate(id) {
    const contract = await this.getContractById(id);
    if (!contract) throw new Error('Contract not found');

    const versions = await contractVersionRepository.findByContract(id);
    const auditLogs = await auditLogService.getAuditLogs({ entityId: id });

    return {
      contractNumber: contract.contractNumber,
      status: contract.status,
      customerName: contract.customerName,
      companyName: contract.companyName,
      signedAt: contract.signedAt,
      counterSignedAt: contract.counterSignedAt,
      signatoryName: contract.signatoryName,
      signatoryIp: contract.signatoryIp,
      signatoryUserAgent: contract.signatoryUserAgent,
      signatureHash: contract.signatureHash,
      version: contract.version,
      versionsHistory: versions,
      auditTrail: auditLogs
    };
  }
}

export const contractService = new ContractService();
