import csv
import io
import re
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def find_table_header(rows):
    best_row_idx = -1
    best_score = -1
    
    for i, row in enumerate(rows):
        if i >= 20: break
        score = 0
        non_empty = 0
        for cell in row:
            if cell is None: continue
            val = str(cell).strip().lower()
            if not val: continue
            non_empty += 1
            if "name" in val or "candidate" in val: score += 2
            if "reg" in val or "roll" in val: score += 2
            if "sec" in val or "dept" in val: score += 2
            if "s.no" in val or "serial" in val or "sl" in val: score += 1
            if "year" in val or "yr" in val: score += 1
            if "email" in val or "mail" in val: score += 1
        
        final_score = score + (non_empty * 0.5)
        if score >= 2 and final_score > best_score:
            best_score = final_score
            best_row_idx = i
            
    return best_row_idx

def analyze_column(header, sample_values):
    header_clean = re.sub(r'[^a-z0-9\s]', '', str(header).strip().lower()) if header else ""
    col_type = "IRRELEVANT"
    field_name = None
    confidence = 0
    
    if "name" in header_clean or "candidate" in header_clean:
        col_type = "STUDENT_FIELD"
        field_name = "name"
        confidence = 85
    elif "reg" in header_clean or "roll" in header_clean:
        col_type = "STUDENT_FIELD"
        field_name = "roll_number"
        confidence = 85
    elif "sec" in header_clean or "class" in header_clean:
        col_type = "STUDENT_FIELD"
        field_name = "class_section"
        confidence = 85
    elif "dept" in header_clean or "branch" in header_clean or "programme" in header_clean or "program" in header_clean or "course" in header_clean:
        col_type = "STUDENT_FIELD"
        field_name = "department"
        confidence = 85
    elif "year" in header_clean or "yr" in header_clean:
        col_type = "STUDENT_FIELD"
        field_name = "year"
        confidence = 85
    elif "email" in header_clean or "mail" in header_clean:
        col_type = "STUDENT_FIELD"
        field_name = "email"
        confidence = 85
    elif "sno" in header_clean or "serial" in header_clean or "slno" in header_clean:
        col_type = "SERIAL_NUMBER"
        confidence = 90
    elif "exam" in header_clean or "date" in header_clean:
        col_type = "EXAM_FIELD"
    elif "college" in header_clean:
        col_type = "COLLEGE_INFORMATION"
    
    # Value Heuristics
    val_conf = 0
    inferred_field = None
    
    reg_count = 0
    sec_count = 0
    email_count = 0
    valid_samples = 0
    
    for v in sample_values:
        if v:
            valid_samples += 1
            v_str = str(v).strip()
            if re.match(r'^\d{8,14}$', v_str):
                reg_count += 1
            if re.match(r'^[A-Z0-9]{1,2}$', v_str.upper()):
                sec_count += 1
            if "@" in v_str and "." in v_str:
                email_count += 1
                
    if valid_samples > 0:
        if (reg_count / valid_samples) > 0.8:
            inferred_field = "roll_number"
            val_conf = 95
        elif (sec_count / valid_samples) > 0.8 and not inferred_field:
            inferred_field = "class_section"
            val_conf = 80
        elif (email_count / valid_samples) > 0.8:
            inferred_field = "email"
            val_conf = 95
        
    if inferred_field and inferred_field == field_name:
        confidence = min(100, confidence + 15)
    elif inferred_field and not field_name:
        field_name = inferred_field
        col_type = "STUDENT_FIELD"
        confidence = val_conf
        
    return {
        "header": header,
        "col_type": col_type,
        "mapped_field": field_name,
        "confidence": confidence
    }

def analyze_excel(content, filename):
    start_time = time.time()
    t_load = time.time()
    rows_head = []
    
    # We only need the first 25 rows for header detection and some samples
    if filename.endswith('.csv'):
        try:
            decoded = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            decoded = content.decode('latin-1')
        reader = csv.reader(io.StringIO(decoded))
        all_rows = list(reader)
        rows_head = all_rows[:30]
        student_count = sum(1 for r in all_rows if any(r))
    elif filename.endswith('.xlsx'):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True, read_only=True)
        sheet = wb.active
        
        # We need all rows to count students anyway, but we can do it efficiently
        all_rows = []
        student_count = 0
        for i, r in enumerate(sheet.iter_rows(values_only=True)):
            row = [str(cell).strip() if cell is not None else "" for cell in r]
            if i < 30:
                rows_head.append(row)
            if any(row):
                student_count += 1
    
    t_load_end = time.time()
    logger.info(f"Analysis: Excel loading: {t_load_end - t_load:.2f}s")
    
    t_table = time.time()
    header_row_idx = find_table_header(rows_head)
    t_table_end = time.time()
    logger.info(f"Analysis: Table detection: {t_table_end - t_table:.2f}s")
    
    if header_row_idx == -1:
        return {"success": False, "error": "Could not identify the table header in the file."}
        
    headers = rows_head[header_row_idx]
    
    t_col = time.time()
    # get samples
    samples = []
    for row in rows_head[header_row_idx+1:]:
        if any(row):
            samples.append(row)
        if len(samples) >= 5:
            break
            
    columns_analysis = []
    for idx, header in enumerate(headers):
        sample_vals = [s[idx] if idx < len(s) else "" for s in samples]
        analysis = analyze_column(header, sample_vals)
        analysis["index"] = idx
        columns_analysis.append(analysis)
    t_col_end = time.time()
    logger.info(f"Analysis: Column detection: {t_col_end - t_col:.2f}s")
    
    # Adjust student count based on header row
    student_count = max(0, student_count - (header_row_idx + 1))
    
    # Deduplicate mapped fields, keeping only the highest confidence for each field
    best_mappings = {}
    for i, col in enumerate(columns_analysis):
        if col["col_type"] == "STUDENT_FIELD" and col["mapped_field"]:
            field = col["mapped_field"]
            if field not in best_mappings or col["confidence"] > best_mappings[field]["confidence"]:
                best_mappings[field] = {"index": i, "confidence": col["confidence"]}
                
    for i, col in enumerate(columns_analysis):
        if col["col_type"] == "STUDENT_FIELD" and col["mapped_field"]:
            field = col["mapped_field"]
            if best_mappings[field]["index"] != i:
                # This is a duplicate mapping with lower confidence, unmap it
                col["col_type"] = "IRRELEVANT"
                col["mapped_field"] = None

    # Ensure required fields exist or can be manually mapped
    required_mapped = {"name": False, "roll_number": False}
    for c in columns_analysis:
        if c["col_type"] == "STUDENT_FIELD" and c["mapped_field"] in required_mapped:
            required_mapped[c["mapped_field"]] = True
            
    needs_review = not all(required_mapped.values()) or any(c["confidence"] < 90 and c["col_type"] == "STUDENT_FIELD" for c in columns_analysis)
    
    logger.info(f"Analysis: Total analysis: {time.time() - start_time:.2f}s")
    
    return {
        "success": True,
        "header_row_idx": header_row_idx,
        "total_students": student_count,
        "columns": columns_analysis,
        "needs_review": needs_review,
        "missing_required": [k for k, v in required_mapped.items() if not v]
    }
