import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  subjects,
  lectures,
  questionBanks,
  questions,
} from './schema.ts';
import { computeContentHash } from '../lib/mcq-engine.ts';
import { ensureSamplePdfsExist } from '../lib/pdf-generator.ts';

let isAlreadySeeded = false;

export async function seedMedicalCurriculumIfEmpty(): Promise<void> {
  if (isAlreadySeeded) return;

  // Ensure real sample multi-page lecture PDFs exist in /public/lectures
  try {
    ensureSamplePdfsExist();
  } catch (err) {
    console.warn('PDF generation deferred:', err);
  }

  const existingSubjects = await db.select({ id: subjects.id }).from(subjects).limit(1);
  if (existingSubjects.length > 0) {
    isAlreadySeeded = true;
    return;
  }

  console.log('Seeding initial MedAtlas medical curriculum...');

  await db.transaction(async (tx) => {
    // --------------------------------------------------------------------------
    // MODULE 1: CARDIOLOGY & VASCULAR MEDICINE
    // --------------------------------------------------------------------------
    const [cardioSubj] = await tx
      .insert(subjects)
      .values({
        slug: 'cardiology-vascular-medicine',
        title: 'Cardiology & Vascular Medicine',
        description:
          'High-yield pathophysiology, diagnostics, and management of acute coronary syndromes, valvular disease, heart failure, and cardiac arrhythmias.',
        displayOrder: 1,
        status: 'published',
      })
      .returning();

    // Lecture 1.1: ACS
    const [acsLect] = await tx
      .insert(lectures)
      .values({
        subjectId: cardioSubj.id,
        title: 'Ischemic Heart Disease & Acute Coronary Syndromes',
        description:
          'Pathophysiology of coronary plaque rupture, biomarker kinetics, 12-lead ECG infarct localization, and emergent revascularization protocols.',
        lectureNumber: 1,
        educationalNotes:
          'High-Yield Key Takeaways:\n1. Transmural inferior ischemia manifests as ST elevations in II, III, and aVF (Right Coronary Artery in 85% of right-dominant individuals).\n2. Dual antiplatelet therapy (Aspirin + Ticagrelor/Prasugrel) and emergent PCI (<90 min door-to-balloon) are standard.\n3. Day 3-5 post-MI mechanical complications include posteromedial papillary muscle rupture presenting with severe acute mitral regurgitation.',
        estimatedMinutes: 45,
        pdfUrl: '/lectures/cardiology-acs.pdf',
        status: 'published',
      })
      .returning();

    const [acsBank] = await tx
      .insert(questionBanks)
      .values({
        subjectId: cardioSubj.id,
        lectureId: acsLect.id,
        title: 'ACS Clinical Decision & ECG Bank',
        description: 'Comprehensive board-style practice MCQs on acute myocardial infarction.',
        bankType: 'practice',
        status: 'published',
      })
      .returning();

    // Lecture 1.2: Arrhythmias
    const [arrhythmiaLect] = await tx
      .insert(lectures)
      .values({
        subjectId: cardioSubj.id,
        title: 'Arrhythmias & Cardiac Electrophysiology',
        description:
          'Mechanisms of supraventricular and ventricular arrhythmias, accessory pathways (WPW), channelopathies, and antiarrhythmic pharmacology.',
        lectureNumber: 2,
        educationalNotes:
          'Key Electrophysiology Points:\n1. AVNRT is terminated acutely by vagal maneuvers or IV adenosine.\n2. In pre-excited AF (WPW), AV nodal blockers (adenosine, beta-blockers, verapamil, digoxin) are contraindicated because they facilitate conduction down the accessory pathway into ventricular fibrillation.\n3. Torsades de pointes is managed acutely with IV magnesium sulfate.',
        estimatedMinutes: 40,
        pdfUrl: '/lectures/cardiology-arrhythmias.pdf',
        status: 'published',
      })
      .returning();

    const [arrhythmiaBank] = await tx
      .insert(questionBanks)
      .values({
        subjectId: cardioSubj.id,
        lectureId: arrhythmiaLect.id,
        title: 'Arrhythmias & Conduction Disorders Bank',
        description: 'Practice questions on cardiac electrophysiology and rhythm emergencies.',
        bankType: 'practice',
        status: 'published',
      })
      .returning();

    // --------------------------------------------------------------------------
    // MODULE 2: PULMONOLOGY & CRITICAL CARE
    // --------------------------------------------------------------------------
    const [pulmSubj] = await tx
      .insert(subjects)
      .values({
        slug: 'pulmonology-critical-care',
        title: 'Pulmonology & Critical Care',
        description:
          'Ventilatory physiology, pulmonary function tests, obstructive and restrictive lung diseases, respiratory failure, and acute lung injury.',
        displayOrder: 2,
        status: 'published',
      })
      .returning();

    const [pulmLect] = await tx
      .insert(lectures)
      .values({
        subjectId: pulmSubj.id,
        title: 'Obstructive vs Restrictive Lung Diseases',
        description:
          'Spirometric flow-volume loops, diffusion capacity (DLCO), asthma phenotyping, and acute COPD exacerbation management.',
        lectureNumber: 1,
        educationalNotes:
          'Key Takeaways:\n1. Obstructive defect: FEV1/FVC < 0.70. Emphysema exhibits decreased DLCO; chronic bronchitis and asthma exhibit normal DLCO.\n2. Restrictive defect: Normal or elevated FEV1/FVC with TLC < 80%. Parenchymal fibrosis reduces DLCO; chest wall deformities maintain normal DLCO.\n3. Acute COPD exacerbation targets SpO2 88-92% and early non-invasive positive pressure ventilation (BiPAP) for acute hypercapnia.',
        estimatedMinutes: 40,
        pdfUrl: '/lectures/pulmonology-obstructive-restrictive.pdf',
        status: 'published',
      })
      .returning();

    const [pulmBank] = await tx
      .insert(questionBanks)
      .values({
        subjectId: pulmSubj.id,
        lectureId: pulmLect.id,
        title: 'Pulmonary Function & Airway Pathology Bank',
        description: 'Clinical questions on spirometry, COPD, asthma, and interstitial lung diseases.',
        bankType: 'practice',
        status: 'published',
      })
      .returning();

    // --------------------------------------------------------------------------
    // MODULE 3: NEUROLOGY & STROKE MEDICINE
    // --------------------------------------------------------------------------
    const [neuroSubj] = await tx
      .insert(subjects)
      .values({
        slug: 'neurology-stroke-medicine',
        title: 'Neurology & Stroke Medicine',
        description:
          'Cerebrovascular anatomy, localization of ischemic and hemorrhagic stroke syndromes, emergent thrombolysis, and intracranial hemorrhages.',
        displayOrder: 3,
        status: 'published',
      })
      .returning();

    const [neuroLect] = await tx
      .insert(lectures)
      .values({
        subjectId: neuroSubj.id,
        title: 'Stroke Syndromes & Cerebrovascular Anatomy',
        description:
          'Vascular territory syndromes (MCA, ACA, PCA, basilar, lacunar), acute thrombolysis inclusion/exclusion criteria, and mechanical thrombectomy.',
        lectureNumber: 1,
        educationalNotes:
          'Key Clinical Points:\n1. MCA stroke causes contralateral faciobrachial motor/sensory deficits > leg, plus aphasia (dominant) or hemineglect (non-dominant).\n2. ACA stroke causes contralateral leg motor/sensory deficits > face/arm with urinary incontinence.\n3. IV alteplase/tenecteplase is approved within 4.5 hours of symptom onset with blood pressure strictly maintained <185/110 mmHg.',
        estimatedMinutes: 45,
        pdfUrl: '/lectures/neurology-stroke.pdf',
        status: 'published',
      })
      .returning();

    const [neuroBank] = await tx
      .insert(questionBanks)
      .values({
        subjectId: neuroSubj.id,
        lectureId: neuroLect.id,
        title: 'Neurovascular Emergencies & Stroke Bank',
        description: 'Practice questions on stroke localization, neuroimaging, and reperfusion.',
        bankType: 'practice',
        status: 'published',
      })
      .returning();

    // --------------------------------------------------------------------------
    // SEED QUESTIONS WITH INDIVIDUAL EXPLANATIONS & PDF PAGE NUMBERS
    // --------------------------------------------------------------------------
    const seedQuestions = [
      // Cardio ACS Question 1 (Page 2)
      {
        subjectId: cardioSubj.id,
        lectureId: acsLect.id,
        questionBankId: acsBank.id,
        questionText:
          'A 58-year-old man presents to the emergency department with 90 minutes of crushing substernal chest pressure radiating to the jaw. His 12-lead ECG shows 3 mm ST-segment elevations in leads II, III, and aVF with reciprocal ST depressions in leads I and aVL. Blood pressure is 88/54 mmHg, and heart rate is 52 bpm. Jugular venous distension is present, but lungs are clear to auscultation bilaterally. Which coronary artery is most likely occluded, and which additional diagnostic step is immediately indicated?',
        optionA:
          'Left anterior descending artery (LAD); immediately administer sublingual nitroglycerin and intravenous metoprolol.',
        optionB:
          'Right coronary artery (RCA); immediately obtain a right-sided 12-lead ECG (lead V4R) and administer intravenous isotonic fluids.',
        optionC:
          'Left circumflex artery (LCx); immediately administer high-dose intravenous loop diuretics and morphine.',
        optionD:
          'Left main coronary artery (LMCA); immediately perform urgent bedside pericardiocentesis for cardiac tamponade.',
        correctAnswer: 'B' as const,
        explanation:
          'ST-segment elevations in leads II, III, and aVF signify an acute transmural inferior myocardial infarction, most commonly caused by occlusion of the Right Coronary Artery (RCA, ~85%). The triad of hypotension, elevated jugular venous pressure, and clear lung fields strongly indicates right ventricular (RV) infarction. Right-sided leads (specifically V4R) confirm RV involvement. In RV infarction, right ventricular preload is critical; vasodilators like nitroglycerin and diuretics drastically reduce preload and precipitate severe refractory hypotension, whereas intravenous volume resuscitation is the initial cornerstone.',
        explanationA:
          'Incorrect. LAD occlusion causes anterior wall STEMI (ST elevations in V1-V4). Nitroglycerin and beta-blockers are contraindicated here due to hypotension (BP 88/54) and suspected RV infarction.',
        explanationB:
          'Correct. ST elevations in II, III, and aVF with hypotension, JVD, and clear lungs represent an inferior-posterior-RV STEMI via RCA occlusion. V4R confirms RV involvement, and IV fluid loading restores RV preload.',
        explanationC:
          'Incorrect. While LCx can occasionally produce inferior STEMI in left-dominant circulation, loop diuretics would cause catastrophic hypotension by further reducing RV preload in RV infarction.',
        explanationD:
          'Incorrect. Left main occlusion typically presents with widespread ST depressions and ST elevation in lead aVR with cardiogenic shock. There is no evidence of pericardial effusion or tamponade.',
        difficulty: 'Medium' as const,
        tags: 'Cardiology,ACS,STEMI,ECG,RCA',
        pageNumber: 2,
        status: 'published' as const,
      },

      // Cardio ACS Question 2 (Page 1)
      {
        subjectId: cardioSubj.id,
        lectureId: acsLect.id,
        questionBankId: acsBank.id,
        questionText:
          'Which cellular and enzymatic mechanism is primarily responsible for the destabilization and rupture of a vulnerable atherosclerotic coronary plaque (thin-cap fibroatheroma)?',
        optionA:
          'Endothelial hyperpolarizing factor-induced apoptosis of vascular smooth muscle cells in the tunica media.',
        optionB:
          'Platelet glycoprotein IIb/IIIa receptor down-regulation leading to defective platelet adherence.',
        optionC:
          'Macrophage-mediated release of matrix metalloproteinases (MMPs) that degrade extracellular fibrillar collagen within the fibrous cap.',
        optionD:
          'Fibroblast proliferation and excessive cross-linking of type I collagen expanding the fibrous cap thickness.',
        correctAnswer: 'C' as const,
        explanation:
          'Vulnerable coronary plaques (thin-cap fibroatheromas, TCFA) are characterized by a large lipid necrotic core, active inflammatory infiltrate, and a thin (<65 um) fibrous cap. Activated macrophages inside the plaque secrete pro-inflammatory cytokines and matrix metalloproteinases (especially MMP-1 collagenase, MMP-9 gelatinase, and MMP-13). These enzymes enzymatically degrade interstitial collagen and extracellular matrix in the fibrous cap, weakening structural tensile strength and precipitating plaque rupture.',
        explanationA:
          'Incorrect. Endothelial hyperpolarizing factor regulates vascular tone and vasodilation; it does not degrade the fibrous cap.',
        explanationB:
          'Incorrect. Platelet glycoprotein IIb/IIIa is upregulated upon activation, mediating platelet aggregation via fibrinogen bridges following plaque rupture, rather than causing plaque rupture itself.',
        explanationC:
          'Correct. Macrophages within the atheroma express matrix metalloproteinases (MMP-1, MMP-9, MMP-13) that break down interstitial type I and III collagen fibers, causing critical thinning and mechanical breakdown of the fibrous cap.',
        explanationD:
          'Incorrect. Thickening and cross-linking of the fibrous cap stabilize the plaque, rendering it less prone to acute thrombosis.',
        difficulty: 'Hard' as const,
        tags: 'Pathology,Atherosclerosis,Plaque Rupture,Cardiology',
        pageNumber: 1,
        status: 'published' as const,
      },

      // Cardio ACS Question 3 (Page 3)
      {
        subjectId: cardioSubj.id,
        lectureId: acsLect.id,
        questionBankId: acsBank.id,
        questionText:
          'A 62-year-old woman is brought to a PCI-capable tertiary medical center 45 minutes after developing acute STEMI. According to current clinical practice guidelines, what is the target door-to-balloon time for primary percutaneous coronary intervention (PCI), and what initial dual antiplatelet therapy (DAPT) regimen should be administered immediately?',
        optionA:
          'Door-to-balloon time <90 minutes; Aspirin (162-325 mg chewed) plus a potent P2Y12 inhibitor (Ticagrelor or Prasugrel).',
        optionB:
          'Door-to-balloon time <180 minutes; Aspirin alone followed by Warfarin anticoagulation after cardiac catheterization.',
        optionC:
          'Door-to-balloon time <60 minutes; Clopidogrel monotherapy without Aspirin to minimize gastrointestinal ulcer bleeding.',
        optionD:
          'Door-to-balloon time <120 minutes; Intravenous tPA infusion combined with oral Apixaban without antiplatelet loading.',
        correctAnswer: 'A' as const,
        explanation:
          'Current AHA/ACC and ESC guidelines establish a door-to-balloon time target of <90 minutes for patients presenting directly to a PCI-capable hospital (<120 minutes if transferred from a non-PCI center). Immediate medical therapy consists of chewed non-enteric-coated Aspirin (162 to 325 mg) combined with a potent oral P2Y12 inhibitor (Ticagrelor 180 mg loading dose or Prasugrel 60 mg loading dose, both preferred over Clopidogrel due to faster onset and greater ischemic protection).',
        explanationA:
          'Correct. Primary PCI should achieve a door-to-balloon time within 90 minutes. Dual antiplatelet therapy with chewed aspirin and a potent P2Y12 antagonist (ticagrelor or prasugrel) is mandatory before coronary wire crossing.',
        explanationB:
          'Incorrect. 180 minutes is well beyond guideline-recommended revascularization targets. Warfarin is not indicated for acute STEMI antiplatelet management.',
        explanationC:
          'Incorrect. Clopidogrel monotherapy is inadequate for acute STEMI revascularization; DAPT with aspirin is required.',
        explanationD:
          'Incorrect. Fibrinolytic therapy (tPA) is only indicated when primary PCI cannot be accomplished within 120 minutes of first medical contact.',
        difficulty: 'Medium' as const,
        tags: 'Cardiology,ACS,PCI,Pharmacology',
        pageNumber: 3,
        status: 'published' as const,
      },

      // Cardio ACS Question 4 (Page 4)
      {
        subjectId: cardioSubj.id,
        lectureId: acsLect.id,
        questionBankId: acsBank.id,
        questionText:
          'On hospital day 4 following an acute inferior STEMI, a 65-year-old man abruptly develops severe dyspnea, orthopnea, and pulmonary edema. Physical examination demonstrates blood pressure 90/60 mmHg, heart rate 110 bpm, and a new harsh, high-pitched holosystolic murmur loudest at the cardiac apex radiating to the axilla. Why is the posteromedial papillary muscle disproportionately susceptible to ischemic rupture compared to the anterolateral papillary muscle?',
        optionA:
          'The posteromedial papillary muscle is subjected to higher systolic shear stress from the aortic valve outflow tract.',
        optionB:
          'The anterolateral papillary muscle has a single blood supply from the right marginal artery.',
        optionC:
          'The posteromedial papillary muscle possesses a single blood supply from the posterior descending artery, whereas the anterolateral muscle has dual supply.',
        optionD:
          'The posteromedial papillary muscle lacks chordae tendineae attachments to the anterior mitral valve leaflet.',
        correctAnswer: 'C' as const,
        explanation:
          'Rupture of a papillary muscle typically occurs 3 to 5 days post-myocardial infarction due to coagulative necrosis. The posteromedial papillary muscle has a singular, solitary arterial supply derived solely from the posterior descending artery (PDA, usually from the RCA). In contrast, the anterolateral papillary muscle receives dual arterial blood supply from both the left anterior descending (LAD) and the left circumflex (LCx) arteries, making it substantially more resistant to ischemic necrosis and rupture.',
        explanationA:
          'Incorrect. Papillary muscle rupture is determined by vascular perfusion anatomy, not subaortic systolic shear stress.',
        explanationB:
          'Incorrect. The anterolateral papillary muscle has a robust dual blood supply from both the LAD diagonal branches and LCx marginal branches.',
        explanationC:
          'Correct. The posteromedial papillary muscle is supplied solely by the posterior descending artery (PDA). When the PDA is occluded in inferior MI, the muscle has no collateral flow and undergoes complete ischemic rupture, causing catastrophic acute mitral regurgitation.',
        explanationD:
          'Incorrect. Both papillary muscles anchor chordae tendineae to both mitral valve leaflets.',
        difficulty: 'Hard' as const,
        tags: 'Cardiology,Mechanical Complications,Mitral Regurgitation,Anatomy',
        pageNumber: 4,
        status: 'published' as const,
      },

      // Cardio Arrhythmias Question 1 (Page 1)
      {
        subjectId: cardioSubj.id,
        lectureId: arrhythmiaLect.id,
        questionBankId: arrhythmiaBank.id,
        questionText:
          'A 22-year-old collegiate athlete with a known diagnosis of Wolff-Parkinson-White (WPW) syndrome presents to the emergency room with palpitations, dizziness, and fatigue. ECG shows an irregularly irregular, wide-complex tachycardia with ventricular rates fluctuating between 180 and 260 bpm and variable QRS morphology. Which medication is strictly CONTRAINDICATED in this patient, and why?',
        optionA:
          'Intravenous Procainamide; it prolongs refractory periods of the accessory pathway and promotes ventricular tachycardia.',
        optionB:
          'Intravenous Adenosine; it selectively blocks AV nodal conduction, shunting all impulses down the accessory pathway and precipitating ventricular fibrillation.',
        optionC:
          'Intravenous Ibutilide; it enhances inward sodium current and causes immediate sinus arrest.',
        optionD:
          'Intravenous Amiodarone; it blocks beta-adrenergic receptors and induces non-cardiogenic pulmonary edema.',
        correctAnswer: 'B' as const,
        explanation:
          'The patient is in pre-excited Atrial Fibrillation with Wolff-Parkinson-White syndrome. AV nodal blocking agents (Adenosine, Beta-blockers, Calcium channel blockers like Verapamil/Diltiazem, and Digoxin - mnemonic "ABCD") are strictly CONTRAINDICATED. These agents inhibit conduction through the normal AV node without slowing the accessory pathway (Bundle of Kent). Deprived of AV nodal competition, 1:1 atrial impulses are shunted down the refractory accessory pathway at extreme rates (>250-300 bpm), rapidly degenerating into fatal Ventricular Fibrillation. Hemodynamically stable patients should receive IV Procainamide; unstable patients require immediate electrical cardioversion.',
        explanationA:
          'Incorrect. IV Procainamide is the drug of choice in hemodynamically stable pre-excited AF because it slows conduction across the accessory pathway.',
        explanationB:
          'Correct. Adenosine (and other AV nodal blockers like verapamil and beta-blockers) blocks the AV node, leaving the accessory pathway unopposed. This rapidly conducts atrial impulses at rates >250 bpm, precipitating ventricular fibrillation and cardiac arrest.',
        explanationC:
          'Incorrect. Ibutilide is a class III antiarrhythmic that can be considered; it does not cause sinus arrest in this setting.',
        explanationD:
          'Incorrect. While IV amiodarone has some AV nodal blocking properties, adenosine is the classic rapid-onset agent strictly contraindicated due to immediate VF risk.',
        difficulty: 'Medium' as const,
        tags: 'Electrophysiology,WPW,Arrhythmias,Contraindications',
        pageNumber: 1,
        status: 'published' as const,
      },

      // Cardio Arrhythmias Question 2 (Page 2)
      {
        subjectId: cardioSubj.id,
        lectureId: arrhythmiaLect.id,
        questionBankId: arrhythmiaBank.id,
        questionText:
          'A 68-year-old woman receiving intravenous Haloperidol and Azithromycin for delirium and pneumonia develops sudden syncope. The cardiac monitor reveals a polymorphic ventricular tachycardia with QRS complexes that continuously twist their axes around the isoelectric baseline. What is the immediate first-line intravenous pharmacological agent for this arrhythmia?',
        optionA:
          'Intravenous Amiodarone 300 mg bolus.',
        optionB:
          'Intravenous Lidocaine 100 mg bolus.',
        optionC:
          'Intravenous Magnesium Sulfate 2 grams.',
        optionD:
          'Intravenous Diltiazem 20 mg bolus.',
        correctAnswer: 'C' as const,
        explanation:
          'The patient has developed Torsades de Pointes (TdP), a distinctive polymorphic ventricular tachycardia occurring in the setting of prolonged QT interval (induced here by combined Haloperidol and Azithromycin). The immediate first-line medical therapy for Torsades de Pointes, regardless of baseline serum magnesium level, is intravenous Magnesium Sulfate (1 to 2 grams infused over 15 minutes or given as a push in cardiac arrest). Magnesium stabilizes the cardiac membrane by blocking early afterdepolarizations (EADs) mediated by L-type calcium channels.',
        explanationA:
          'Incorrect. Amiodarone prolongs the QT interval and can worsen or sustain Torsades de Pointes.',
        explanationB:
          'Incorrect. Lidocaine is a class Ib antiarrhythmic sometimes used as a second-line option for refractory cases, but IV Magnesium is the undisputed first-line agent.',
        explanationC:
          'Correct. Intravenous Magnesium Sulfate (1-2 g) is the first-line therapy for Torsades de Pointes. It suppresses early afterdepolarizations and terminates the arrhythmia even in patients with normal serum magnesium concentrations.',
        explanationD:
          'Incorrect. Diltiazem is a calcium channel blocker used for rate control in atrial tachycardias; it is ineffective and hazardous in ventricular tachyarrhythmias.',
        difficulty: 'Easy' as const,
        tags: 'Cardiology,Pharmacology,Torsades,QT Prolongation',
        pageNumber: 2,
        status: 'published' as const,
      },

      // Pulm Question 1 (Page 1)
      {
        subjectId: pulmSubj.id,
        lectureId: pulmLect.id,
        questionBankId: pulmBank.id,
        questionText:
          'A 55-year-old heavy smoker presents with progressive exertional dyspnea and chronic cough. Pulmonary function testing reveals: FEV1 = 52% of predicted, FVC = 82% of predicted, FEV1/FVC ratio = 0.58 (post-bronchodilator), Total Lung Capacity (TLC) = 118% of predicted, and Diffusing Capacity of the Lung for Carbon Monoxide (DLCO) = 48% of predicted. Which diagnosis is most consistent with these findings?',
        optionA:
          'Severe chronic persistent asthma with fixed airway remodeling.',
        optionB:
          'Pulmonary emphysema with destruction of alveolar capillary membranes.',
        optionC:
          'Idiopathic pulmonary fibrosis with honeycombing.',
        optionD:
          'Chronic bronchitis without parenchymal alveolar destruction.',
        correctAnswer: 'B' as const,
        explanation:
          'The post-bronchodilator FEV1/FVC ratio < 0.70 confirms an obstructive ventilatory defect, and TLC > 100% indicates hyperinflation. The critical differentiator between emphysema and chronic bronchitis (or asthma) is the Diffusing Capacity of the Lungs for Carbon Monoxide (DLCO). In emphysema, elastase-mediated destruction of alveolar septa destroys the capillary bed, leading to a marked reduction in DLCO (<60%). In contrast, chronic bronchitis and uncomplicated asthma involve the conducting airways while sparing the alveolar capillary interface, maintaining a normal DLCO.',
        explanationA:
          'Incorrect. Asthma is characterized by a normal or even elevated DLCO due to increased pulmonary capillary blood volume.',
        explanationB:
          'Correct. FEV1/FVC < 0.70 confirms airflow obstruction, while hyperinflation (TLC 118%) and significantly reduced DLCO (48%) reflect the alveolar wall and microvascular destruction characteristic of pulmonary emphysema.',
        explanationC:
          'Incorrect. Idiopathic pulmonary fibrosis causes a restrictive ventilatory defect with normal/high FEV1/FVC (>0.70) and reduced TLC (<80%).',
        explanationD:
          'Incorrect. Chronic bronchitis affects conducting airways and typically features a normal DLCO.',
        difficulty: 'Medium' as const,
        tags: 'Pulmonology,COPD,Emphysema,Spirometry,DLCO',
        pageNumber: 1,
        status: 'published' as const,
      },

      // Pulm Question 2 (Page 2)
      {
        subjectId: pulmSubj.id,
        lectureId: pulmLect.id,
        questionBankId: pulmBank.id,
        questionText:
          'A 67-year-old man with severe COPD is admitted for an acute exacerbation. Arterial blood gas on room air shows: pH 7.28, PaCO2 62 mmHg, PaO2 50 mmHg, and HCO3- 28 mEq/L. High-flow oxygen via non-rebreather mask is initiated, raising his SpO2 to 99%. Thirty minutes later, he becomes lethargic and somnolent; repeat ABG demonstrates pH 7.18 and PaCO2 84 mmHg. What was the primary physiological mechanism driving this acute clinical deterioration, and what is the target oxygen saturation in acute COPD exacerbations?',
        optionA:
          'Complete abolition of central chemoreceptor sensitivity; target SpO2 should be 95-100%.',
        optionB:
          'Methemoglobinemia induced by oxygen toxicity; target SpO2 should be 92-96%.',
        optionC:
          'Worsened ventilation-perfusion (V/Q) mismatch due to reversal of hypoxic pulmonary vasoconstriction and the Haldane effect; target SpO2 is 88-92%.',
        optionD:
          'Bronchospasm induced by hyperoxic cooling of tracheal receptors; target SpO2 is 80-84%.',
        correctAnswer: 'C' as const,
        explanation:
          'Excessive oxygen administration in acute COPD exacerbations induces hypercapnic respiratory failure primarily via two mechanisms: (1) Reversal of physiological hypoxic pulmonary vasoconstriction: alveolar hyperoxia vasodilates capillaries in non-ventilated lung zones, shifting blood away from well-ventilated alveoli and dramatically increasing physiological dead space (V/Q mismatch); (2) The Haldane effect: oxygenation of hemoglobin decreases its affinity for CO2, displacing CO2 into the dissolved plasma phase. Suppression of peripheral hypoxic drive contributes only minimally (<15%). To avoid this, controlled oxygen therapy strictly targets an SpO2 of 88% to 92%.',
        explanationA:
          'Incorrect. Central chemoreceptors respond to PaCO2/pH, not PaO2. The hypoxic drive hypothesis accounts for only a minor fraction of hypercapnia compared to V/Q mismatch.',
        explanationB:
          'Incorrect. High-flow oxygen does not cause methemoglobinemia.',
        explanationC:
          'Correct. Oxygen-induced hypercapnia in COPD results predominantly from the release of hypoxic vasoconstriction causing V/Q mismatch and the Haldane effect. Guidelines mandate a titrated SpO2 target of 88-92% to prevent acute hypercapnic coma.',
        explanationD:
          'Incorrect. Tracheal cooling does not cause acute CO2 narcosis.',
        difficulty: 'Hard' as const,
        tags: 'Pulmonology,COPD,Oxygen Therapy,ABG,Physiology',
        pageNumber: 2,
        status: 'published' as const,
      },

      // Neuro Question 1 (Page 1)
      {
        subjectId: neuroSubj.id,
        lectureId: neuroLect.id,
        questionBankId: neuroBank.id,
        questionText:
          'A 71-year-old right-handed man presents with sudden inability to speak and right-sided weakness. Neurological examination reveals right facial droop and dense right arm paralysis with only mild right leg weakness. He is awake, understands complex verbal commands, and follows multi-step directions, but can only produce fragmented, halting, non-fluent speech with grammatical errors. Which vascular territory and anatomical cortical area are infarcted?',
        optionA:
          'Superior division of the left middle cerebral artery (MCA); Broca area in the left inferior frontal gyrus.',
        optionB:
          'Inferior division of the left middle cerebral artery (MCA); Wernicke area in the left superior temporal gyrus.',
        optionC:
          'Left anterior cerebral artery (ACA); supplementary motor cortex in the left medial frontal gyrus.',
        optionD:
          'Left posterior cerebral artery (PCA); angular gyrus in the left parietal lobe.',
        correctAnswer: 'A' as const,
        explanation:
          'The patient demonstrates expressive (Broca / motor / non-fluent) aphasia: speech production is effortful, slow, and telegraphic, while comprehension remains intact. This localizes to the posterior inferior frontal gyrus (Brodmann areas 44 and 45) in the dominant (left) hemisphere. Associated motor deficits affecting the contralateral face and arm greater than the leg correspond to the motor homunculus on the lateral convex convexity of the brain. Both the precentral motor cortex for face/arm and the Broca area are supplied by the superior division of the Left Middle Cerebral Artery (MCA).',
        explanationA:
          'Correct. The superior division of the left MCA supplies the lateral precentral gyrus (face and arm motor cortex) and the inferior frontal gyrus (Broca area), resulting in right faciobrachial paresis and non-fluent expressive aphasia with preserved comprehension.',
        explanationB:
          'Incorrect. The inferior division of the left MCA supplies Wernicke area, which causes receptive fluent aphasia (impaired comprehension with effortless, nonsensical speech) and homonymous superior quadrantanopia, typically without dense hemiparesis.',
        explanationC:
          'Incorrect. Left ACA occlusion causes contralateral lower extremity motor and sensory loss greater than face/arm involvement.',
        explanationD:
          'Incorrect. Left PCA infarction causes contralateral homonymous hemianopia with macular sparing and alexia without agraphia.',
        difficulty: 'Medium' as const,
        tags: 'Neurology,Stroke,MCA,Aphasia,Neuroanatomy',
        pageNumber: 1,
        status: 'published' as const,
      },

      // Neuro Question 2 (Page 2)
      {
        subjectId: neuroSubj.id,
        lectureId: neuroLect.id,
        questionBankId: neuroBank.id,
        questionText:
          'A 64-year-old woman is evaluated in the emergency department 2 hours after acute onset of left hemiplegia and left facial paralysis. Non-contrast brain CT excludes intracranial hemorrhage. Initial blood pressure is 196/114 mmHg. What blood pressure threshold must be achieved and sustained before initiating intravenous thrombolysis (Alteplase or Tenecteplase)?',
        optionA:
          'Blood pressure must be lowered to <140/90 mmHg using intravenous nitroprusside.',
        optionB:
          'Blood pressure must be maintained between 185/110 mmHg and 220/120 mmHg to maintain collateral penumbral perfusion.',
        optionC:
          'Blood pressure must be carefully lowered to <185/110 mmHg prior to thrombolysis and maintained <180/105 mmHg for at least 24 hours post-infusion.',
        optionD:
          'Blood pressure must not be pharmacologically treated prior to thrombolysis unless systolic pressure exceeds 240 mmHg.',
        correctAnswer: 'C' as const,
        explanation:
          'Strict blood pressure control is paramount when administering intravenous thrombolytics for acute ischemic stroke to mitigate the risk of fatal hemorrhagic transformation. Current AHA/ASA guidelines state that blood pressure must be safely lowered to <185 mmHg systolic and <110 mmHg diastolic prior to starting IV alteplase or tenecteplase (using IV labetalol, nicardipine, or clevidipine). Once thrombolytic therapy begins, blood pressure must be monitored and maintained <180/105 mmHg for at least the subsequent 24 hours.',
        explanationA:
          'Incorrect. Lowering blood pressure to <140/90 acutely in ischemic stroke may hypoperfuse the ischemic penumbra and worsen neurological deficits.',
        explanationB:
          'Incorrect. Administering thrombolytics with blood pressure >185/110 mmHg is strictly contraindicated due to high risk of symptomatic intracranial hemorrhage.',
        explanationC:
          'Correct. Blood pressure must be lowered to <185/110 mmHg before thrombolytic infusion and maintained <180/105 mmHg for 24 hours thereafter to prevent hemorrhagic transformation.',
        explanationD:
          'Incorrect. The 220/120 mmHg threshold applies only to patients who are NOT candidates for thrombolysis or thrombectomy (permissive hypertension).',
        difficulty: 'Easy' as const,
        tags: 'Neurology,Stroke,Thrombolysis,Pharmacology,Emergency',
        pageNumber: 2,
        status: 'published' as const,
      },
    ];

    for (const q of seedQuestions) {
      const contentHash = computeContentHash(
        `${q.subjectId}|${q.lectureId}|${q.questionText}|${q.optionA}|${q.optionB}|${q.optionC}|${q.optionD}`
      );
      await tx.insert(questions).values({
        ...q,
        version: 1,
        contentHash,
      });
    }

    console.log(`Seeded ${seedQuestions.length} medical questions across 3 modules and 4 lectures.`);
  });
}
